'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  adminEmail: string;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check existing active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && session.access_token) {
        setIsAuthenticated(true);
        setUser(session.user);
        setToken(session.access_token);
        setAdminEmail(session.user.email || 'admin@gharsoap.shop');
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // 2. Subscribe to auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session.access_token) {
        setIsAuthenticated(true);
        setUser(session.user);
        setToken(session.access_token);
        setAdminEmail(session.user.email || 'admin@gharsoap.shop');
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        setAdminEmail('');
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !pass) {
        return { success: false, error: 'Please enter both your email and password.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Incorrect email or password. Please verify your credentials.' };
        }
        return { success: false, error: error.message };
      }

      if (data?.session && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        setToken(data.session.access_token);
        setAdminEmail(data.user.email || cleanEmail);
        return { success: true };
      }

      return { success: false, error: 'Could not establish admin session.' };
    } catch {
      return { success: false, error: 'Network error connecting to authentication server.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors during sign out
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setAdminEmail('');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        adminEmail,
        isLoading,
        login,
        logout,
      }}
    >
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
