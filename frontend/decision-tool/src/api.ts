import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Types for API requests and responses
export interface SuggestOptionsRequest {
  decision: string;
  api_key: string;
  model?: string;
}

export interface SuggestOptionsResponse {
  options: string[];
}

export interface SuggestCriteriaRequest {
  decision: string;
  options: string[];
  api_key: string;
  model?: string;
}

export interface CriterionSuggestion {
  name: string;
  weight: number;
}

export interface SuggestCriteriaResponse {
  criteria: CriterionSuggestion[];
}

export interface GeneratePlanRequest {
  decision: string;
  selected_option: string;
  criteria: Array<{ name: string; weight: number }>;
  api_key: string;
  model?: string;
}

export interface GeneratePlanResponse {
  plan: string;
}

// API functions
export const decisionAPI = {
  /**
   * Get LLM-suggested options for a decision
   */
  async suggestOptions(request: SuggestOptionsRequest): Promise<SuggestOptionsResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/suggest-options`, request);
      return response.data;
    } catch (error) {
      console.error('Error suggesting options:', error);
      throw new Error('Failed to get option suggestions from LLM');
    }
  },

  /**
   * Get LLM-suggested criteria and weights for evaluating options
   */
  async suggestCriteria(request: SuggestCriteriaRequest): Promise<SuggestCriteriaResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/suggest-criteria`, request);
      return response.data;
    } catch (error) {
      console.error('Error suggesting criteria:', error);
      throw new Error('Failed to get criteria suggestions from LLM');
    }
  },

  /**
   * Generate an implementation plan for the selected decision
   */
  async generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/generate-plan`, request);
      return response.data;
    } catch (error) {
      console.error('Error generating plan:', error);
      throw new Error('Failed to generate implementation plan from LLM');
    }
  },

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('API health check failed');
    }
  }
};

// Utility function to get API key from environment or user input
export const getApiKey = (): string | null => {
  // First check if it's in environment variables (for development)
  const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }
  
  // Otherwise, get from localStorage (user entered)
  return localStorage.getItem('openai_api_key');
};

// Utility function to set API key in localStorage
export const setApiKey = (apiKey: string): void => {
  localStorage.setItem('openai_api_key', apiKey);
};

// Utility function to remove API key from localStorage
export const removeApiKey = (): void => {
  localStorage.removeItem('openai_api_key');
};
