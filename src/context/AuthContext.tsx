'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  adminEmail: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'gharsoap_admin_session_v2';
const SESSION_DURATION_HOURS = 12;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('admin@gharsoaps.shop');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { expiry, email, authToken } = JSON.parse(stored);
        if (new Date().getTime() < expiry && authToken) {
          setIsAuthenticated(true);
          setToken(authToken);
          if (email) setAdminEmail(email);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const expiry = new Date().getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ expiry, email: data.email, authToken: data.token })
        );
        setIsAuthenticated(true);
        setToken(data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid passcode' };
    } catch {
      return { success: false, error: 'Network error authenticating' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout, adminEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
