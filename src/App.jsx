import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <div className="hero">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        
        <header className="header">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">NLP Tracker</span>
          </div>
        </header>

        <main className="main">
          <h1 className="title">
            <span className="title-line">NLP-Powered</span>
            <span className="title-highlight">Assignment Tracker</span>
          </h1>
          
          <p className="subtitle">
            Intelligent task management powered by natural language processing.
            Stay organized, meet deadlines, achieve more.
          </p>

          <div className="card">
            <button onClick={() => setCount((count) => count + 1)} className="button">
              Count is {count}
            </button>
            <p className="card-text">
              Edit <code>src/App.jsx</code> and save to test HMR
            </p>
          </div>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">🎯</div>
              <h3>Smart Parsing</h3>
              <p>Extract deadlines and priorities from natural text</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Real-time Sync</h3>
              <p>Changes sync instantly across all your devices</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔔</div>
              <h3>Smart Alerts</h3>
              <p>Never miss a deadline with intelligent reminders</p>
            </div>
          </div>
        </main>

        <footer className="footer">
          <p>Built with React + Vite • Ready for Vercel</p>
        </footer>
      </div>
    </div>
  )
}

export default App

