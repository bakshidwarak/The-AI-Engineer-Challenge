import React, { useState, useEffect } from 'react';
import './App.css';
import { decisionAPI, getApiKey, setApiKey, removeApiKey } from './api';

// Types for the decision-making process
interface Decision {
  question: string;
  options: Option[];
  criteria: Criterion[];
  scores: ScoreEntry[];
  results: Result[];
  implementationPlan?: string;
}

interface Option {
  id: number;
  name: string;
}

interface Criterion {
  id: number;
  name: string;
  weight: number;
  order: number;
}

interface ScoreEntry {
  optionId: number;
  criterionId: number;
  score: number;
}

interface Result {
  optionId: number;
  optionName: string;
  totalScore: number;
  weightedScore: number;
}

type Step = 'api-key' | 'decision' | 'options' | 'criteria' | 'ordering' | 'scoring' | 'results' | 'plan';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('api-key');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [decision, setDecision] = useState<Decision>({
    question: '',
    options: [],
    criteria: [],
    scores: [],
    results: []
  });

  // Loading states
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [suggestedCriteria, setSuggestedCriteria] = useState<Array<{name: string, weight: number}>>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Check if API key exists on component mount
  useEffect(() => {
    const existingApiKey = getApiKey();
    if (existingApiKey) {
      setCurrentStep('decision');
    }
  }, []);

  // API Key Setup
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setCurrentStep('decision');
      setApiKeyInput('');
    }
  };

  const handleLogout = () => {
    removeApiKey();
    setCurrentStep('api-key');
    setDecision({
      question: '',
      options: [],
      criteria: [],
      scores: [],
      results: []
    });
  };

  // Step 1: Decision Question with LLM integration
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision.question.trim()) {
      setCurrentStep('options');
      
      // Get LLM suggestions for options
      const apiKey = getApiKey();
      if (apiKey) {
        setLoadingSuggestions(true);
        try {
          const response = await decisionAPI.suggestOptions({
            decision: decision.question,
            api_key: apiKey
          });
          setSuggestedOptions(response.options);
        } catch (error) {
          console.error('Failed to get option suggestions:', error);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    }
  };

  // Step 2: Options
  const [newOption, setNewOption] = useState('');
  
  const addOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOption.trim()) {
      const option = { id: Date.now(), name: newOption.trim() };
      setDecision(prev => ({
        ...prev,
        options: [...prev.options, option]
      }));
      setNewOption('');
    }
  };

  const addSuggestedOption = (optionText: string) => {
    const option = { id: Date.now(), name: optionText };
    setDecision(prev => ({
      ...prev,
      options: [...prev.options, option]
    }));
    // Remove from suggestions
    setSuggestedOptions(prev => prev.filter(opt => opt !== optionText));
  };

  const removeOption = (id: number) => {
    setDecision(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.id !== id)
    }));
  };

  const continueToCriteria = async () => {
    if (decision.options.length >= 2) {
      setCurrentStep('criteria');
      
      // Get LLM suggestions for criteria
      const apiKey = getApiKey();
      if (apiKey) {
        setLoadingSuggestions(true);
        try {
          const response = await decisionAPI.suggestCriteria({
            decision: decision.question,
            options: decision.options.map(opt => opt.name),
            api_key: apiKey
          });
          setSuggestedCriteria(response.criteria);
        } catch (error) {
          console.error('Failed to get criteria suggestions:', error);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    }
  };

  // Step 3: Criteria
  const [newCriterion, setNewCriterion] = useState('');
  
  const addCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCriterion.trim()) {
      const criterion = { 
        id: Date.now(), 
        name: newCriterion.trim(), 
        weight: 0,
        order: decision.criteria.length
      };
      setDecision(prev => ({
        ...prev,
        criteria: [...prev.criteria, criterion]
      }));
      setNewCriterion('');
    }
  };

  const addSuggestedCriterion = (criterionData: {name: string, weight: number}) => {
    const criterion = { 
      id: Date.now(), 
      name: criterionData.name, 
      weight: criterionData.weight,
      order: decision.criteria.length
    };
    setDecision(prev => ({
      ...prev,
      criteria: [...prev.criteria, criterion]
    }));
    // Remove from suggestions
    setSuggestedCriteria(prev => prev.filter(crit => crit.name !== criterionData.name));
  };

  const removeCriterion = (id: number) => {
    setDecision(prev => ({
      ...prev,
      criteria: prev.criteria.filter(crit => crit.id !== id)
    }));
  };

  const updateCriterionWeight = (id: number, weight: number) => {
    setDecision(prev => ({
      ...prev,
      criteria: prev.criteria.map(crit => 
        crit.id === id ? { ...crit, weight } : crit
      )
    }));
  };

  const continueToOrdering = () => {
    if (decision.criteria.length >= 2) {
      setCurrentStep('ordering');
    }
  };

  // Step 4: Criteria Ordering
  const [orderingStep, setOrderingStep] = useState(0);
  const [orderedCriteria, setOrderedCriteria] = useState<Criterion[]>([]);
  const [currentPair, setCurrentPair] = useState<[Criterion, Criterion] | null>(null);

  const startOrdering = () => {
    const criteria = [...decision.criteria];
    setOrderedCriteria(criteria);
    setOrderingStep(1);
    // Set up first pair
    if (criteria.length >= 2) {
      setCurrentPair([criteria[0], criteria[1]]);
    }
  };

  const handleOrderingChoice = (chosenCriterion: Criterion) => {
    const currentIndex = orderingStep - 1;
    const nextIndex = orderingStep;
    
    // Update the order of the chosen criterion
    const updatedCriteria = orderedCriteria.map(crit => 
      crit.id === chosenCriterion.id 
        ? { ...crit, order: currentIndex }
        : crit
    );
    
    if (orderingStep < decision.criteria.length - 1) {
      setOrderingStep(orderingStep + 1);
      setOrderedCriteria(updatedCriteria);
      // Set up next pair
      const nextPair: [Criterion, Criterion] = [updatedCriteria[nextIndex], updatedCriteria[nextIndex + 1]];
      setCurrentPair(nextPair);
    } else {
      // Final ordering complete
      const finalOrdered = updatedCriteria.map(crit => 
        crit.id === chosenCriterion.id 
          ? { ...crit, order: currentIndex }
          : crit
      ).sort((a, b) => a.order - b.order);
      
      setDecision(prev => ({
        ...prev,
        criteria: finalOrdered.map((crit, index) => ({
          ...crit,
          weight: 100 - (index * (100 / (finalOrdered.length - 1)))
        }))
      }));
      setCurrentStep('scoring');
    }
  };

  // Step 5: Scoring
  const getScore = (optionId: number, criterionId: number) => {
    const scoreEntry = decision.scores.find(
      s => s.optionId === optionId && s.criterionId === criterionId
    );
    return scoreEntry?.score || 0;
  };

  const updateScore = (optionId: number, criterionId: number, score: number) => {
    const existingIndex = decision.scores.findIndex(
      s => s.optionId === optionId && s.criterionId === criterionId
    );
    
    if (existingIndex >= 0) {
      const updatedScores = [...decision.scores];
      updatedScores[existingIndex] = { optionId, criterionId, score };
      setDecision(prev => ({ ...prev, scores: updatedScores }));
    } else {
      setDecision(prev => ({
        ...prev,
        scores: [...prev.scores, { optionId, criterionId, score }]
      }));
    }
  };

  const calculateResults = () => {
    const totalWeight = decision.criteria.reduce((sum, crit) => sum + crit.weight, 0);
    
    const results: Result[] = decision.options.map(option => {
      let totalScore = 0;
      let weightedScore = 0;
      
      decision.criteria.forEach(criterion => {
        const score = getScore(option.id, criterion.id);
        totalScore += score;
        weightedScore += score * criterion.weight;
      });
      
      return {
        optionId: option.id,
        optionName: option.name,
        totalScore: totalScore / decision.criteria.length,
        weightedScore: weightedScore / totalWeight
      };
    });
    
    results.sort((a, b) => b.weightedScore - a.weightedScore);
    
    setDecision(prev => ({ ...prev, results }));
    setCurrentStep('results');
  };

  // Generate implementation plan
  const generateImplementationPlan = async () => {
    const apiKey = getApiKey();
    if (!apiKey || decision.results.length === 0) return;

    const topResult = decision.results[0];
    setLoadingPlan(true);
    
    try {
      const response = await decisionAPI.generatePlan({
        decision: decision.question,
        selected_option: topResult.optionName,
        criteria: decision.criteria.map(c => ({ name: c.name, weight: c.weight })),
        api_key: apiKey
      });
      
      setDecision(prev => ({ ...prev, implementationPlan: response.plan }));
      setCurrentStep('plan');
    } catch (error) {
      console.error('Failed to generate implementation plan:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  const resetDecision = () => {
    setDecision({
      question: '',
      options: [],
      criteria: [],
      scores: [],
      results: []
    });
    setSuggestedOptions([]);
    setSuggestedCriteria([]);
    setCurrentStep('decision');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'api-key':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>Welcome to AI-Powered Decision Making</h2>
              <p className="step-description">
                To get started, please enter your OpenAI API key. This will enable AI suggestions for options, criteria, and implementation plans.
              </p>
            </div>
            <form onSubmit={handleApiKeySubmit} className="decision-form">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your OpenAI API key..."
                className="text-input"
                style={{ width: '100%', marginBottom: '1rem' }}
              />
              <button type="submit" className="continue-button" disabled={!apiKeyInput.trim()}>
                Get Started →
              </button>
            </form>
            <div className="api-key-help">
              <p><small>Your API key is stored locally and never sent to our servers except to make requests to OpenAI on your behalf.</small></p>
            </div>
          </div>
        );

      case 'decision':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>What decision are we making today?</h2>
              <p className="step-description">
                Let's start by clearly defining the decision you need to make. The AI will suggest relevant options for you.
              </p>
              <button onClick={handleLogout} className="logout-button">
                Change API Key
              </button>
            </div>
            <form onSubmit={handleDecisionSubmit} className="decision-form">
              <textarea
                value={decision.question}
                onChange={(e) => setDecision(prev => ({ ...prev, question: e.target.value }))}
                placeholder="e.g., Which job offer should I accept? Which car should I buy? Which project should we prioritize?"
                className="decision-textarea"
                rows={4}
              />
              <button type="submit" className="continue-button" disabled={!decision.question.trim()}>
                Continue →
              </button>
            </form>
          </div>
        );

      case 'options':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>What are your options?</h2>
              <p className="step-description">
                For: <strong>"{decision.question}"</strong>
              </p>
            </div>
            
            {loadingSuggestions && (
              <div className="loading-suggestions">
                <p>🤖 AI is suggesting options for you...</p>
              </div>
            )}

            {suggestedOptions.length > 0 && (
              <div className="suggestions-section">
                <h3>AI Suggestions:</h3>
                <div className="suggestions-list">
                  {suggestedOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => addSuggestedOption(option)}
                      className="suggestion-button"
                    >
                      + {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={addOption} className="options-form">
              <div className="input-group">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add your own option..."
                  className="text-input"
                />
                <button type="submit" className="add-button" disabled={!newOption.trim()}>
                  Add Option
                </button>
              </div>
            </form>

            <div className="items-list">
              {decision.options.map(option => (
                <div key={option.id} className="item-card">
                  <span className="item-name">{option.name}</span>
                  <button 
                    onClick={() => removeOption(option.id)}
                    className="remove-button"
                    title="Remove option"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button 
                onClick={continueToCriteria} 
                className="continue-button"
                disabled={decision.options.length < 2}
              >
                Continue to Criteria →
              </button>
            </div>
          </div>
        );

      case 'criteria':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>What criteria matter to you?</h2>
              <p className="step-description">
                The AI has suggested criteria and weights based on your decision and options. You can adjust the weights as needed.
              </p>
            </div>

            {loadingSuggestions && (
              <div className="loading-suggestions">
                <p>🤖 AI is suggesting criteria and weights...</p>
              </div>
            )}

            {suggestedCriteria.length > 0 && (
              <div className="suggestions-section">
                <h3>AI Suggestions:</h3>
                <div className="criteria-suggestions">
                  {suggestedCriteria.map((criterion, index) => (
                    <button
                      key={index}
                      onClick={() => addSuggestedCriterion(criterion)}
                      className="suggestion-button"
                    >
                      + {criterion.name} ({criterion.weight}%)
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={addCriterion} className="criteria-form">
              <div className="input-group">
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="Add your own criterion..."
                  className="text-input"
                />
                <button type="submit" className="add-button" disabled={!newCriterion.trim()}>
                  Add Criterion
                </button>
              </div>
            </form>

            <div className="criteria-list">
              {decision.criteria.map(criterion => (
                <div key={criterion.id} className="criterion-card">
                  <span className="criterion-name">{criterion.name}</span>
                  <div className="weight-controls">
                    <label>Weight: </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterion.weight}
                      onChange={(e) => updateCriterionWeight(criterion.id, parseInt(e.target.value) || 0)}
                      className="weight-input"
                    />
                    <span>%</span>
                  </div>
                  <button 
                    onClick={() => removeCriterion(criterion.id)}
                    className="remove-button"
                    title="Remove criterion"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button 
                onClick={continueToOrdering} 
                className="continue-button"
                disabled={decision.criteria.length < 2}
              >
                Continue to Prioritization →
              </button>
            </div>
          </div>
        );

      case 'ordering':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>Let's prioritize your criteria</h2>
              <p className="step-description">
                We'll determine the relative importance of each criterion through pairwise comparisons.
              </p>
            </div>

            {orderingStep === 0 && (
              <div className="ordering-intro">
                <p>I'll show you pairs of criteria and ask which one is more important to you.</p>
                <button onClick={startOrdering} className="start-button">
                  Start Prioritization
                </button>
              </div>
            )}

            {orderingStep > 0 && currentPair && (
              <div className="ordering-comparison">
                <h3>Which is more important to you?</h3>
                <div className="comparison-cards">
                  {currentPair.map(criterion => (
                    <button
                      key={criterion.id}
                      onClick={() => handleOrderingChoice(criterion)}
                      className="comparison-card"
                    >
                      <h4>{criterion.name}</h4>
                    </button>
                  ))}
                </div>
                <div className="progress-indicator">
                  Step {orderingStep} of {decision.criteria.length - 1}
                </div>
              </div>
            )}
          </div>
        );

      case 'scoring':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>Rate each option</h2>
              <p className="step-description">
                For each option, rate how well it performs on each criterion (1-10 scale).
              </p>
            </div>

            <div className="scoring-table">
              <table>
                <thead>
                  <tr>
                    <th>Option / Criterion</th>
                    {decision.criteria.map(criterion => (
                      <th key={criterion.id} className="criterion-header">
                        {criterion.name}
                        <div className="weight-indicator">{criterion.weight.toFixed(0)}%</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decision.options.map(option => (
                    <tr key={option.id}>
                      <td className="option-name">{option.name}</td>
                      {decision.criteria.map(criterion => (
                        <td key={criterion.id} className="score-cell">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={getScore(option.id, criterion.id) || ''}
                            onChange={(e) => updateScore(option.id, criterion.id, parseInt(e.target.value) || 0)}
                            placeholder="1-10"
                            className="score-input"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="step-actions">
              <button onClick={calculateResults} className="calculate-button">
                Calculate Results
              </button>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>Your Decision Results</h2>
              <p className="step-description">
                Based on your criteria and ratings, here's how your options rank:
              </p>
            </div>

            <div className="results-container">
              {decision.results.map((result, index) => (
                <div key={result.optionId} className={`result-card ${index === 0 ? 'winner' : ''}`}>
                  <div className="result-rank">#{index + 1}</div>
                  <div className="result-content">
                    <h3>{result.optionName}</h3>
                    <div className="result-scores">
                      <span className="weighted-score">
                        Weighted Score: {result.weightedScore.toFixed(2)}
                      </span>
                      <span className="average-score">
                        Average Score: {result.totalScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {index === 0 && <div className="winner-badge">Recommended</div>}
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button 
                onClick={generateImplementationPlan} 
                className="plan-button"
                disabled={loadingPlan}
              >
                {loadingPlan ? '🤖 Generating Plan...' : 'Generate Implementation Plan →'}
              </button>
              <button onClick={resetDecision} className="reset-button">
                Start New Decision
              </button>
            </div>
          </div>
        );

      case 'plan':
        return (
          <div className="step-container">
            <div className="step-header">
              <h2>Implementation Plan</h2>
              <p className="step-description">
                Here's your AI-generated plan for implementing: <strong>{decision.results[0]?.optionName}</strong>
              </p>
            </div>

            <div className="plan-content">
              <div 
                className="plan-text"
                dangerouslySetInnerHTML={{ 
                  __html: decision.implementationPlan?.replace(/\n/g, '<br>') || '' 
                }}
              />
            </div>

            <div className="step-actions">
              <button onClick={resetDecision} className="reset-button">
                Start New Decision
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="decision-tool-container">
      <header className="tool-header">
        <h1>AI-Powered Decision Making Assistant</h1>
        <p className="subtitle">Make better decisions with AI guidance</p>
      </header>

      <div className="tool-content">
        {renderStep()}
      </div>
    </div>
  );
}

export default App;
