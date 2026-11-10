'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  User,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Truck,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { adminEmail, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordNotice({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordNotice({ type: 'error', message: error.message });
      } else {
        setPasswordNotice({ type: 'success', message: 'Admin password updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordNotice({ type: 'error', message: 'Network error updating password. Please try again.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Store Information Card */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-neutral-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 font-heading">
                Store Profile
              </h2>
              <p className="text-xs text-neutral-400">Ghar Soaps official e-commerce store</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Store Online & Live</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60 space-y-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Storefront Website
            </div>
            <div className="font-bold text-neutral-900 flex items-center justify-between">
              <span>https://gharsoap.shop</span>
              <a
                href="https://gharsoap.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-black p-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="text-[10px] text-neutral-500">Live Customer Portal</div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60 space-y-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Admin Portal
            </div>
            <div className="font-bold text-neutral-900">
              admin.gharsoap.shop
            </div>
            <div className="text-[10px] text-emerald-700 font-bold">Secure Merchant Dashboard</div>
          </div>
        </div>
      </div>

      {/* Admin Account & Change Password */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-neutral-200/90 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 font-heading">
              Admin Account
            </h2>
            <p className="text-xs text-neutral-400">Manage your login email and security password</p>
          </div>
        </div>

        {/* Current Login Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70">
          <div>
            <div className="text-xs font-bold text-neutral-900">Signed In As</div>
            <div className="text-xs font-medium text-neutral-600 mt-0.5">{adminEmail || 'admin@gharsoap.shop'}</div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-neutral-200 px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleUpdatePassword} className="border-t border-neutral-100 pt-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-neutral-700" />
            <span>Change Admin Password</span>
          </div>

          {passwordNotice && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                passwordNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {passwordNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{passwordNotice.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword}
              className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
            >
              {isUpdatingPassword ? 'Saving Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Shipping & Delivery Defaults */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 font-heading">
              Dispatch & Fulfillment Preferences
            </h2>
            <p className="text-xs text-neutral-400">Default settings for incoming orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/60">
            <div className="font-bold text-neutral-900">Default Courier</div>
            <div className="text-neutral-500 mt-0.5">BlueDart Express Air / Delhivery</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/60">
            <div className="font-bold text-neutral-900">Order Dispatch Target</div>
            <div className="text-neutral-500 mt-0.5">Same day dispatch for orders before 2:00 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
};
