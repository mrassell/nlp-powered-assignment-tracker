import { useState } from 'react';
import { useUser } from '../context/UserContext';
import './Login.css';

export function Login() {
  const [inputValue, setInputValue] = useState('');
  const { login } = useUser();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      login(inputValue);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glow login-glow-1"></div>
      <div className="login-glow login-glow-2"></div>
      
      <div className="login-card">
        <div className="login-icon">📚</div>
        <h1 className="login-title">Assignment Tracker</h1>
        <p className="login-subtitle">Enter your username to access your assignments</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter username..."
            className="login-input"
            autoFocus
          />
          <button type="submit" className="login-button" disabled={!inputValue.trim()}>
            Continue
            <span className="button-arrow">→</span>
          </button>
        </form>
        
        <p className="login-hint">
          Your username is used to save and retrieve your assignments
        </p>
      </div>
    </div>
  );
}

