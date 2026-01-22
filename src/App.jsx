import { UserProvider, useUser } from './context/UserContext';
import { Login } from './components/Login';
import { AssignmentTracker } from './components/AssignmentTracker';
import './App.css';

function AppContent() {
  const { username } = useUser();
  
  return username ? <AssignmentTracker /> : <Login />;
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
