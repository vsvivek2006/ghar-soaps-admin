'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('gharsoap_admin_email_pref');
      if (savedEmail) {
        setEmail(savedEmail);
      } else {
        setEmail('admin@gharsoap.shop');
      }
    } catch {
      setEmail('admin@gharsoap.shop');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid email or password.');
      } else {
        try {
          localStorage.setItem('gharsoap_admin_email_pref', email.trim());
        } catch {
          // ignore storage errors
        }
      }
    } catch {
      setError('An unexpected connection error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200/90 p-6 sm:p-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-md">
            <img
              src="https://www.gharsoaps.shop/cdn/shop/files/PNG-Logo-Gharsoaps.png?v=1745295691"
              alt="Ghar Soaps"
              className="h-9 w-auto object-contain brightness-0 invert"
              onError={(e) => {
                // fallback if image blocked
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading pt-2">
            Ghar Soaps Admin
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Sign in with your email and password to manage store orders and customers.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="admin@gharsoap.shop"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-300 text-sm font-medium text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter your admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-neutral-300 text-sm font-medium text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] touch-manipulation min-h-[48px]"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security badge */}
        <div className="pt-2 text-center border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted Store Session</span>
        </div>
      </div>
    </div>
  );
};
