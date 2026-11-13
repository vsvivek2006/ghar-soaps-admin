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
  CreditCard,
  Zap,
  Globe,
  Lock,
  Smartphone,
  PackageCheck,
  Building,
  Sparkles,
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
        setPasswordNotice({ type: 'success', message: 'Admin security password updated successfully!' });
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
    <div className="space-y-6 sm:space-y-8 max-w-5xl animate-fade-in">
      {/* 1. STORE PROFILE & LIVE PLATFORMS */}
      <div className="bg-white/85 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 font-heading">
                Store Profile & Live Domains
              </h2>
              <p className="text-xs text-neutral-400">Ghar Soaps official direct-to-consumer store configuration</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Storefront Online & Live</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Storefront Card */}
          <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/50 space-y-1.5 hover:bg-neutral-50 transition">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Customer Storefront</span>
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="font-extrabold text-neutral-900 text-sm flex items-center justify-between">
              <span>gharsoap.shop</span>
              <a
                href="https://gharsoap.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-black p-1 transition"
                title="Open storefront"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              SSL 256-bit Encrypted
            </div>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/50 space-y-1.5 hover:bg-neutral-50 transition">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Merchant Admin Portal</span>
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="font-extrabold text-neutral-900 text-sm">
              admin.gharsoap.shop
            </div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Authenticated Session
            </div>
          </div>

          {/* Business & Currency */}
          <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/50 space-y-1.5 hover:bg-neutral-50 transition">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Store Currency & Region</span>
              <Building className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="font-extrabold text-neutral-900 text-sm">
              INR (₹) • India Domestic
            </div>
            <div className="text-[11px] text-neutral-500">
              GST Inclusive Pricing
            </div>
          </div>
        </div>
      </div>

      {/* 2. 100% PREPAID STORE POLICY & PAYMENT GATEWAY */}
      <div className="bg-white/85 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 font-heading">
                Payment Gateway & Store Policy
              </h2>
              <p className="text-xs text-neutral-400">Strict 100% Prepaid Model with Razorpay Live Integration</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-800 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200 self-start sm:self-auto shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Zero COD • 0% RTO Risk</span>
          </span>
        </div>

        {/* 100% Prepaid Explanation Banner */}
        <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 font-heading">
              Why Ghar Soaps Operates Strictly on 100% Prepaid (No COD)
            </h3>
          </div>
          <p className="text-xs text-emerald-900/80 leading-relaxed max-w-3xl">
            To ensure zero inventory wastage, eliminate fake address checkouts, and avoid the 30%+ Return-To-Origin (RTO) courier losses common with Cash on Delivery, Ghar Soaps exclusively accepts upfront digital payments via UPI, Cards, and Netbanking. Every order in this dashboard represents a verified, guaranteed customer commitment.
          </p>
        </div>

        {/* Gateway Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/50 space-y-1">
            <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Live Gateway Partner</div>
            <div className="font-extrabold text-neutral-900 text-sm flex items-center gap-2">
              <span>Razorpay Payments Live</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="text-[11px] text-neutral-500">Direct instant UPI intent & card tokenization</div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/50 space-y-1">
            <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Webhook Cryptographic Sync</div>
            <div className="font-extrabold text-neutral-900 text-sm flex items-center gap-2">
              <span>HMAC SHA-256 Verified</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Secure</span>
            </div>
            <div className="text-[11px] text-neutral-500">Real-time payment confirmation without polling delay</div>
          </div>
        </div>
      </div>

      {/* 3. DISPATCH & FULFILLMENT PREFERENCES */}
      <div className="bg-white/85 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-5">
        <div className="flex items-center gap-3.5 border-b border-neutral-100 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 font-heading">
              Dispatch & Delivery Logistics
            </h2>
            <p className="text-xs text-neutral-400">Default courier routing and fulfillment targets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/50 space-y-1">
            <div className="font-extrabold text-neutral-900 text-sm">Primary Express Couriers</div>
            <div className="text-neutral-500">BlueDart Express Air / Delhivery Express Surface</div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1">Direct air-cargo dispatch for metro cities</div>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/50 space-y-1">
            <div className="font-extrabold text-neutral-900 text-sm">Same-Day Dispatch Cutoff</div>
            <div className="text-neutral-500">Orders placed before 2:00 PM IST dispatched same day</div>
            <div className="text-[10px] text-neutral-400 mt-1">Average delivery timeline: 2 - 4 business days</div>
          </div>
        </div>
      </div>

      {/* 4. ADMIN SECURITY & CHANGE PASSWORD */}
      <div className="bg-white/85 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-5">
        <div className="flex items-center gap-3.5 border-b border-neutral-100 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 font-heading">
              Admin Account & Security
            </h2>
            <p className="text-xs text-neutral-400">Manage merchant credentials and password encryption</p>
          </div>
        </div>

        {/* Current Login Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60">
          <div>
            <div className="text-xs font-extrabold text-neutral-900">Signed In As</div>
            <div className="text-xs font-medium text-neutral-600 mt-0.5">{adminEmail || 'admin@gharsoap.shop'}</div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-neutral-200 px-3.5 py-2 rounded-xl transition self-start sm:self-auto cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-neutral-900 uppercase tracking-wide">
            <KeyRound className="w-4 h-4 text-neutral-700" />
            <span>Update Admin Security Password</span>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Confirm New Password</label>
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
              className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              {isUpdatingPassword ? 'Saving Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
