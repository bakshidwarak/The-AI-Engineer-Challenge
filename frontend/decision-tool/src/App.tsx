import React, { useState } from 'react';
import './App.css';

// Types for options and attributes
interface Option {
  id: number;
  name: string;
}

interface Attribute {
  id: number;
  name: string;
  weight: number; // 0-100
}

function App() {
  // State for options and attributes
  const [options, setOptions] = useState<Option[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeWeight, setNewAttributeWeight] = useState(50);

  // Add Option with form input
  const addOption = () => {
    if (newOptionName.trim()) {
      setOptions([...options, { id: Date.now(), name: newOptionName.trim() }]);
      setNewOptionName('');
    }
  };

  // Add Attribute with form input
  const addAttribute = () => {
    if (newAttributeName.trim() && newAttributeWeight >= 0 && newAttributeWeight <= 100) {
      setAttributes([...attributes, { 
        id: Date.now(), 
        name: newAttributeName.trim(), 
        weight: newAttributeWeight 
      }]);
      setNewAttributeName('');
      setNewAttributeWeight(50);
    }
  };

  // Remove option
  const removeOption = (id: number) => {
    setOptions(options.filter(option => option.id !== id));
  };

  // Remove attribute
  const removeAttribute = (id: number) => {
    setAttributes(attributes.filter(attr => attr.id !== id));
  };

  // Handle form submissions
  const handleOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addOption();
  };

  const handleAttributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAttribute();
  };

  return (
    <div className="decision-tool-container">
      <header className="tool-header">
        <h1>Decision Making Tool</h1>
        <p className="subtitle">Compare options systematically to make better decisions</p>
      </header>

      <div className="tool-layout">
        {/* Left Panel - Options */}
        <div className="panel options-panel">
          <h2>Options</h2>
          <p className="panel-description">Define the choices you're considering</p>
          
          <form onSubmit={handleOptionSubmit} className="input-form">
            <div className="input-group">
              <input
                type="text"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                placeholder="Enter option name..."
                className="text-input"
              />
              <button type="submit" className="add-button">
                Add Option
              </button>
            </div>
          </form>

          <div className="items-list">
            {options.map(option => (
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
            {options.length === 0 && (
              <p className="empty-state">No options added yet. Add your first option above.</p>
            )}
          </div>
        </div>

        {/* Right Panel - Attributes */}
        <div className="panel attributes-panel">
          <h2>Attributes & Weights</h2>
          <p className="panel-description">Define criteria and their importance</p>
          
          <form onSubmit={handleAttributeSubmit} className="input-form">
            <div className="input-group">
              <input
                type="text"
                value={newAttributeName}
                onChange={(e) => setNewAttributeName(e.target.value)}
                placeholder="Enter attribute name..."
                className="text-input"
              />
            </div>
            <div className="input-group">
              <label htmlFor="weight-input">Weight: {newAttributeWeight}%</label>
              <input
                id="weight-input"
                type="range"
                min="0"
                max="100"
                value={newAttributeWeight}
                onChange={(e) => setNewAttributeWeight(parseInt(e.target.value))}
                className="weight-slider"
              />
              <button type="submit" className="add-button">
                Add Attribute
              </button>
            </div>
          </form>

          <div className="items-list">
            {attributes.map(attr => (
              <div key={attr.id} className="item-card">
                <div className="item-info">
                  <span className="item-name">{attr.name}</span>
                  <span className="weight-badge">{attr.weight}%</span>
                </div>
                <button 
                  onClick={() => removeAttribute(attr.id)}
                  className="remove-button"
                  title="Remove attribute"
                >
                  ×
                </button>
              </div>
            ))}
            {attributes.length === 0 && (
              <p className="empty-state">No attributes added yet. Add your first attribute above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Scoring Matrix */}
      {options.length > 0 && attributes.length > 0 && (
        <div className="scoring-section">
          <h2>Scoring Matrix</h2>
          <p className="panel-description">Rate each option on each attribute (1-10 scale)</p>
          <div className="scoring-table">
            <table>
              <thead>
                <tr>
                  <th>Option / Attribute</th>
                  {attributes.map(attr => (
                    <th key={attr.id} className="attribute-header">
                      {attr.name}
                      <div className="weight-indicator">{attr.weight}%</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {options.map(option => (
                  <tr key={option.id}>
                    <td className="option-name">{option.name}</td>
                    {attributes.map(attr => (
                      <td key={attr.id} className="score-cell">
                        <input
                          type="number"
                          min="1"
                          max="10"
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
          <button className="calculate-button">
            Calculate Results
          </button>
        </div>
      )}

      {/* Results Section */}
      <div className="results-section">
        <h2>Results & Analysis</h2>
        <p className="panel-description">View your decision analysis and recommendations</p>
        <div className="results-placeholder">
          <p>Complete the scoring matrix above to see results</p>
        </div>
      </div>
    </div>
  );
}

export default App;
