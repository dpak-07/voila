import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('voila_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('voila_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const data = await authApi.getMe();
          if (data && data.user) {
            setUser(data.user);
            sessionStorage.setItem('voila_user', JSON.stringify(data.user));
          }
        } catch (err) {
          console.warn('[Auth verification expired/invalid]:', err);
          logout();
        }
      }
      setIsLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    const accessToken = data.access_token;
    const userData = data.user || { username };
    
    sessionStorage.setItem('voila_token', accessToken);
    sessionStorage.setItem('voila_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    if (data.access_token) {
      sessionStorage.setItem('voila_token', data.access_token);
      sessionStorage.setItem('voila_user', JSON.stringify(data.user || userData));
      setToken(data.access_token);
      setUser(data.user || userData);
    }
    return data;
  };

  const logout = () => {
    sessionStorage.removeItem('voila_token');
    sessionStorage.removeItem('voila_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
