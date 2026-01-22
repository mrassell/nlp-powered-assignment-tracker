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
      <div className="login-card">
        <div className="login-icon">📚</div>
        <h1 className="login-title">
          Study <span className="login-title-highlight">Buddy</span>
        </h1>
        <p className="login-subtitle">Your cute assignment tracker ✨</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your username..."
            className="login-input"
            autoFocus
          />
          <button type="submit" className="login-button" disabled={!inputValue.trim()}>
            Let's go!
            <span className="button-arrow">→</span>
          </button>
        </form>
        
        <p className="login-hint">
          ✨ Your data is saved with your username
        </p>
      </div>
    </div>
  );
}
