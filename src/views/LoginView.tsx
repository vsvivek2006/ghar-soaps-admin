import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, ArrowRight, KeyRound, Sparkles, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const success = login(pin);
      if (!success) {
        setError('Invalid Admin PIN. Please try again or check your configuration.');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200/80 p-8 sm:p-10 space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-heading pt-2">
            Ghar Soaps Admin
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            Enter your secure admin passcode to access live orders & store operations.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Admin Passcode / PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter security PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-300 text-sm font-semibold tracking-wider text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <span>{isLoading ? 'Authenticating...' : 'Unlock Admin Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Hex Passcode Hint */}
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>10-Digit Hex Auth Passcode</span>
          </div>
          <div className="text-xs font-mono font-bold text-neutral-900 bg-white border border-neutral-200 py-1 px-3 rounded-lg inline-block">
            27906e7eaf
          </div>
          <p className="text-[10px] text-neutral-400 pt-0.5">
            Configured in <code className="text-neutral-700 font-mono">.env.local</code> (<code className="text-neutral-700 font-mono">VITE_ADMIN_PIN</code>)
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-semibold pt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected with Supabase Row-Level Security</span>
        </div>
      </div>
    </div>
  );
};

