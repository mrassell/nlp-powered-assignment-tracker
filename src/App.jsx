import { UserProvider, useUser } from './context/UserContext';
import { Login } from './components/Login';
import { AssignmentTracker } from './components/AssignmentTracker';
import './App.css';

function AppContent() {
  const { user, loading } = useUser();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  return user ? <AssignmentTracker /> : <Login />;
}

function App() {
  return (
    <UserProvider>
      <div className="app">
        <AppContent />
      </div>
    </UserProvider>
  );
}

export default App;
