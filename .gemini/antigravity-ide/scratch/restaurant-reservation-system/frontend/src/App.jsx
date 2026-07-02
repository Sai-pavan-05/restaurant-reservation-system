import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { API_BASE } from './config';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(true);

  // Validate stored token on startup
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (res.ok) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        // Do not force logout on network disconnect, but set loading false
      } finally {
        setAuthLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f3f4f6',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.1)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <h3>Verifying authentication...</h3>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />
      
      {!user ? (
        view === 'login' ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            switchToRegister={() => setView('register')}
          />
        ) : (
          <Register
            onRegisterSuccess={handleLoginSuccess}
            switchToLogin={() => setView('login')}
          />
        )
      ) : user.role === 'admin' ? (
        <AdminDashboard token={token} />
      ) : (
        <CustomerDashboard token={token} user={user} />
      )}
    </div>
  );
}

export default App;
