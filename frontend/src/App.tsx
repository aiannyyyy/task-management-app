import React, { useState, useEffect } from 'react';
import { authService } from './services/authService';
import Dashboard from './pages/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AcceptInvite from './components/AcceptInvite';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setIsAuthenticated(!!user);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  const handleRegister = () => setIsAuthenticated(true);
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  // Handle /accept-invite?token=... route
  const isInvitePage = window.location.pathname === '/accept-invite' || window.location.search.includes('token=');
  if (isInvitePage) {
    return (
      <AcceptInvite
        onGoToDashboard={() => {
          window.history.replaceState({}, '', '/');
          setIsAuthenticated(true);
        }}
        onGoToLogin={() => {
          window.history.replaceState({}, '', '/');
          setIsAuthenticated(false);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onRegister={handleRegister} onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onLogin={handleLogin} onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default App;