import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { getAuthToken, setAuthToken, setUnauthorizedCallback } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register 401 interceptor callback to clear session
    setUnauthorizedCallback(() => {
      setUser(null);
      setIsAuthenticated(false);
      setAuthToken(null);
    });

    const token = getAuthToken();
    if (token) {
      authService.getCurrentUser()
        .then((currUser) => {
          if (currUser && currUser.id) {
            setUser(currUser);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            setAuthToken(null);
          }
        })
        .catch(() => {
          setUser(null);
          setIsAuthenticated(false);
          setAuthToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await authService.register(userData);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    try {
      const res = await authService.demoLogin();
      setUser(res.user);
      setIsAuthenticated(true);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, demoLogin, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
