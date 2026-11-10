import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  adminEmail: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'gharsoap_admin_session_v1';
const SESSION_DURATION_HOURS = 12;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('admin@gharsoaps.shop');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { expiry, email } = JSON.parse(stored);
        if (new Date().getTime() < expiry) {
          setIsAuthenticated(true);
          if (email) setAdminEmail(email);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = (pin: string): boolean => {
    const validPin = import.meta.env.VITE_ADMIN_PIN || 'admin123';
    if (pin.trim() === validPin.trim()) {
      const expiry = new Date().getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ expiry, email: 'admin@gharsoaps.shop' })
      );
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, adminEmail }}>
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

