# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import json
from typing import Optional, List

# Initialize FastAPI application with a title
app = FastAPI(title="Decision Making API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Define data models for decision-making endpoints
class ChatRequest(BaseModel):
    developer_message: str
    user_message: str
    model: Optional[str] = "gpt-4o-mini"
    api_key: str

class SuggestOptionsRequest(BaseModel):
    decision: str
    api_key: str
    model: Optional[str] = "gpt-4o-mini"

class SuggestCriteriaRequest(BaseModel):
    decision: str
    options: List[str]
    api_key: str
    model: Optional[str] = "gpt-4o-mini"

class GeneratePlanRequest(BaseModel):
    decision: str
    selected_option: str
    criteria: List[dict]  # {name: str, weight: float}
    api_key: str
    model: Optional[str] = "gpt-4o-mini"

class ConversationalOptionsRequest(BaseModel):
    decision: str
    conversation_history: List[dict]  # [{"role": "user"|"assistant", "content": str}]
    current_options: List[str]  # Current options the user has
    user_message: str
    api_key: str
    model: Optional[str] = "gpt-4o-mini"

# Helper function to get LLM response
async def get_llm_response(client: OpenAI, messages: List[dict], model: str = "gpt-4o-mini"):
    """Get a non-streaming response from the LLM"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "developer", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint: Suggest options for a decision
@app.post("/api/suggest-options")
async def suggest_options(request: SuggestOptionsRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        
        prompt = f"""
        You are a decision-making assistant. A user needs to make the following decision:
        
        "{request.decision}"
        
        Please suggest 4-6 realistic and diverse options they could consider. 
        Provide your response as a JSON array of strings, where each string is a potential option.
        
        Example format:
        ["Option 1", "Option 2", "Option 3", "Option 4"]
        
        Make sure the options are:
        1. Realistic and actionable
        2. Diverse in approach
        3. Relevant to the decision context
        4. Clearly stated
        """
        
        messages = [
            {"role": "system", "content": "You are a helpful decision-making assistant. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        response_content = await get_llm_response(client, messages, request.model)
        
        # Try to parse the JSON response
        try:
            options = json.loads(response_content)
            if not isinstance(options, list):
                raise ValueError("Response is not a list")
            return {"options": options}
        except (json.JSONDecodeError, ValueError):
            # Fallback: extract options from text
            lines = response_content.strip().split('\n')
            options = []
            for line in lines:
                line = line.strip()
                if line and (line.startswith('"') or line.startswith('•') or line.startswith('-') or line.startswith('*')):
                    # Clean up the line
                    clean_option = line.strip('•-*"').strip()
                    if clean_option:
                        options.append(clean_option)
            
            return {"options": options[:6]}  # Limit to 6 options
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint: Suggest criteria and weights
@app.post("/api/suggest-criteria")
async def suggest_criteria(request: SuggestCriteriaRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        
        options_text = "\n".join([f"- {option}" for option in request.options])
        
        prompt = f"""
        You are a decision-making assistant. A user needs to make this decision:
        
        "{request.decision}"
        
        They are considering these options:
        {options_text}
        
        Please suggest 4-6 important criteria they should consider when evaluating these options, along with suggested weights (importance percentages that sum to 100%).
        
        Provide your response as a JSON array of objects, where each object has "name" and "weight" properties.
        
        Example format:
        [
            {{"name": "Cost", "weight": 25}},
            {{"name": "Time Required", "weight": 20}},
            {{"name": "Long-term Benefits", "weight": 30}},
            {{"name": "Risk Level", "weight": 25}}
        ]
        
        Make sure:
        1. Criteria are relevant to the decision and options
        2. Weights are realistic and sum to 100
        3. Include both quantitative and qualitative factors
        4. Consider short-term and long-term impacts
        """
        
        messages = [
            {"role": "system", "content": "You are a helpful decision-making assistant. Always respond with valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        response_content = await get_llm_response(client, messages, request.model)
        
        # Try to parse the JSON response
        try:
            criteria = json.loads(response_content)
            if not isinstance(criteria, list):
                raise ValueError("Response is not a list")
            
            # Validate weights sum to approximately 100
            total_weight = sum(c.get('weight', 0) for c in criteria)
            if abs(total_weight - 100) > 5:  # Allow small variance
                # Normalize weights to sum to 100
                for criterion in criteria:
                    criterion['weight'] = round((criterion.get('weight', 0) / total_weight) * 100, 1)
            
            return {"criteria": criteria}
        except (json.JSONDecodeError, ValueError):
            # Fallback: create default criteria
            default_criteria = [
                {"name": "Cost", "weight": 25},
                {"name": "Feasibility", "weight": 25},
                {"name": "Long-term Impact", "weight": 25},
                {"name": "Personal Preference", "weight": 25}
            ]
            return {"criteria": default_criteria}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint: Conversational options generation
@app.post("/api/conversational-options")
async def conversational_options(request: ConversationalOptionsRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        
        # Build conversation context
        conversation_context = ""
        if request.conversation_history:
            for msg in request.conversation_history[-6:]:  # Keep last 6 messages for context
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role == "user":
                    conversation_context += f"User: {content}\n"
                elif role == "assistant":
                    conversation_context += f"Assistant: {content}\n"
        
        current_options_text = "\n".join([f"- {option}" for option in request.current_options]) if request.current_options else "None yet"
        
        system_prompt = """You are a helpful decision-making assistant specializing in generating and refining options. 

Your role is to:
1. Help users brainstorm creative and realistic options for their decisions
2. Suggest refinements or variations of existing options
3. Ask clarifying questions to better understand their needs
4. Provide context and insights about different approaches
5. Help them think outside the box while staying practical

Guidelines:
- Be conversational and engaging
- Ask follow-up questions when helpful
- Suggest specific, actionable options
- Consider both conventional and unconventional approaches
- Help users explore different angles and perspectives
- Keep responses concise but informative
- When suggesting options, explain briefly why they might be worth considering

You should respond naturally to the user's questions and requests about their decision options."""

        user_prompt = f"""Decision Context: "{request.decision}"

Current options the user has:
{current_options_text}

Recent conversation:
{conversation_context}

User's current message: "{request.user_message}"

Please respond conversationally to help them with their options. If they're asking for new suggestions, provide 2-4 specific options with brief explanations. If they're asking questions or want refinements, address those directly."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_content = await get_llm_response(client, messages, request.model)
        
        return {
            "response": response_content,
            "suggested_options": []  # We'll extract these in the frontend if needed
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoint: Generate implementation plan
@app.post("/api/generate-plan")
async def generate_plan(request: GeneratePlanRequest):
    try:
        client = OpenAI(api_key=request.api_key)
        
        criteria_text = "\n".join([f"- {c['name']}: {c['weight']}%" for c in request.criteria])
        
        prompt = f"""
        You are a decision-making assistant. A user has made the following decision:
        
        Decision: "{request.decision}"
        Selected Option: "{request.selected_option}"
        
        This choice was evaluated based on these criteria:
        {criteria_text}
        
        Please create a detailed implementation plan for executing this decision. Include:
        
        1. **Immediate Next Steps** (What to do in the next 1-7 days)
        2. **Short-term Actions** (What to do in the next 1-4 weeks)
        3. **Medium-term Milestones** (What to achieve in 1-3 months)
        4. **Long-term Goals** (What to accomplish in 3-12 months)
        5. **Potential Challenges** and how to address them
        6. **Success Metrics** to track progress
        7. **Resources Needed** (time, money, people, tools, etc.)
        
        Make the plan:
        - Specific and actionable
        - Realistic and achievable
        - Well-structured with clear timelines
        - Comprehensive but not overwhelming
        
        Use markdown formatting for better readability.
        """
        
        messages = [
            {"role": "system", "content": "You are a helpful decision-making and planning assistant. Provide detailed, actionable plans."},
            {"role": "user", "content": prompt}
        ]
        
        response_content = await get_llm_response(client, messages, request.model)
        
        return {"plan": response_content}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
