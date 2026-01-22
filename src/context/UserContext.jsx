import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('tracker_username') || null;
  });

  useEffect(() => {
    if (username) {
      localStorage.setItem('tracker_username', username);
    } else {
      localStorage.removeItem('tracker_username');
    }
  }, [username]);

  const login = (name) => {
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (cleanName) {
      setUsername(cleanName);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUsername(null);
  };

  return (
    <UserContext.Provider value={{ username, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

