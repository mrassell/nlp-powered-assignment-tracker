import { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try signing in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid credentials. Please check your email and password.');
          break;
        case 'auth/configuration-not-found':
        case 'auth/api-key-not-valid':
          setError('Firebase is not configured. Check your environment variables.');
          break;
        default:
          setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Google sign-in error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Add it in Firebase Console → Authentication → Settings → Authorized domains.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else {
        setError('Google sign-in failed. ' + (err.message || 'Please try again.'));
      }
    } finally {
      setLoading(false);
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
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleEmailAuth} className="login-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="login-input"
            required
            disabled={loading}
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="login-input"
            required
            disabled={loading}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={6}
          />
          <button 
            type="submit" 
            className="login-button" 
            disabled={loading || !email || !password}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign up' : 'Sign in')}
            <span className="button-arrow">→</span>
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          className="google-button"
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button 
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="toggle-auth-mode"
          disabled={loading}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
        
        <p className="login-hint">
          ✨ Your data is securely saved to your account
        </p>
      </div>
    </div>
  );
}
