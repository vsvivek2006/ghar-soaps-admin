'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  RefreshCw,
  Search,
  ExternalLink,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Smartphone,
  Landmark,
  Wallet,
  X,
  Package,
  RotateCcw,
} from 'lucide-react';
import {
  RazorpayLivePayment,
  PaymentDashboardStats,
  GatewayInfo,
} from '../types';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { formatPrice, formatDate } from '../lib/utils';
import { adminDataCache } from '../lib/adminDataCache';
import { GharLoader } from '../components/GharLoader';

interface PaymentsViewProps {
  token: string | null;
  onOpenOrder?: (order: any) => void;
}

type TimeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

export const PaymentsView: React.FC<PaymentsViewProps> = ({ token }) => {
  // Initialize state instantly from in-memory cache if available (0ms loading)
  const cached = adminDataCache.getPayments();

  const [payments, setPayments] = useState<RazorpayLivePayment[]>(cached?.payments || []);
  const [stats, setStats] = useState<PaymentDashboardStats | null>(cached?.stats || null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(cached?.gateway_info || null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'captured' | 'failed' | 'refunded'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'upi' | 'card' | 'netbanking' | 'wallet'>('all');

  // Selected payment for detail modal
  const [selectedPayment, setSelectedPayment] = useState<RazorpayLivePayment | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // 1. Fetch live payment data from Admin API
  const fetchPaymentData = useCallback(async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setIsRefreshing(true);
      const res = await fetch('/api/payments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const p = json.data.payments || [];
        const s = json.data.stats || null;
        const g = json.data.gateway_info || null;

        setPayments(p);
        setStats(s);
        setGatewayInfo(g);

        // Update global cache
        adminDataCache.setPayments({
          payments: p,
          orders: json.data.orders || [],
          events: json.data.events || [],
          stats: s,
          gateway_info: g,
        });
      } else {
        if (!isSilent) {
          showNotification(json.error || 'Failed to fetch gateway payments', 'error');
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        showNotification(err.message || 'Network error connecting to payment gateway', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!adminDataCache.hasValidPayments()) {
      fetchPaymentData(Boolean(cached));
    }
  }, [fetchPaymentData, cached]);

  // Helper: Filter by date
  const isWithinTimeRange = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    const now = new Date();
    const itemDate = new Date(dateStr).getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const sevenDaysAgo = now.getTime() - 7 * 86400000;
    const thirtyDaysAgo = now.getTime() - 30 * 86400000;

    switch (timeFilter) {
      case 'today':
        return itemDate >= startOfToday;
      case 'yesterday':
        return itemDate >= startOfYesterday && itemDate < startOfToday;
      case '7d':
        return itemDate >= sevenDaysAgo;
      case '30d':
        return itemDate >= thirtyDaysAgo;
      default:
        return true;
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Time filter
      if (!isWithinTimeRange(p.created_at)) return false;

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Method filter
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      // Search query (ID, email, contact, order_id)
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchId = p.id.toLowerCase().includes(query);
        const matchEmail = (p.email || '').toLowerCase().includes(query);
        const matchContact = (p.contact || '').toLowerCase().includes(query);
        const matchOrder = (p.order_id || '').toLowerCase().includes(query);
        const matchDesc = (p.description || '').toLowerCase().includes(query);
        return matchId || matchEmail || matchContact || matchOrder || matchDesc;
      }

      return true;
    });
  }, [payments, statusFilter, methodFilter, timeFilter, debouncedSearch]);

  // Payment Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Failed
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            {status}
          </span>
        );
    }
  };

  // Payment Method Pill
  const renderMethodBadge = (p: RazorpayLivePayment) => {
    switch (p.method) {
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            UPI {p.vpa ? `(${p.vpa})` : ''}
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            {p?.card?.network || 'Card'} {p?.card?.last4 ? `•••• ${p.card.last4}` : ''}
          </span>
        );
      case 'netbanking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Landmark className="w-3.5 h-3.5 text-amber-600" />
            {p.bank || 'Netbanking'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <Wallet className="w-3.5 h-3.5 text-neutral-500" />
            {p.wallet || p.method || 'Online'}
          </span>
        );
    }
  };

  // Cold loading (clean, floating, no card box)
  if (isLoading) {
    return (
      <div className="py-28 flex items-center justify-center">
        <GharLoader />
      </div>
    );
  }

  // Pre-calculate clean rounded integers (no decimals like 3.88 or 4.99)
  const totalVolumeRounded = Math.round(stats?.total_volume || 0);
  const netPayoutRounded = Math.round(stats?.net_settlement_volume || stats?.total_volume || 0);
  const estFeeRounded = Math.round(stats?.estimated_fees || 0);
  const successRateRounded = Math.round(stats?.success_rate ?? 100);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Toast feedback */}
      {feedbackMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-xl border flex items-center gap-2 transition ${
            feedbackMsg.type === 'success'
              ? 'bg-neutral-900 text-white border-neutral-800'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedbackMsg.text}
        </div>
      )}

      {/* 1. CLEAN & DECLUTTERED PAYMENTS HEADER */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-heading">
                Payments
              </h1>
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Razorpay Live
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Real-time payment transactions and settlement audit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPaymentData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-700' : 'text-neutral-500'}`} />
              <span>Refresh</span>
            </button>

            <a
              href="https://dashboard.razorpay.com/app/payments"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white transition shadow-xs"
            >
              <span>Razorpay Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE REVENUE METRICS (Strictly Whole Integer Rounding) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Gross Volume */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {formatPrice(totalVolumeRounded)}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            <span className="text-emerald-700 font-bold">{stats?.total_captured_count || payments.length}</span> paid transactions
          </div>
        </div>

        {/* Net Bank Payout */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Net Bank Payout</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-950">
            {formatPrice(netPayoutRounded)}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Est. fees: {formatPrice(estFeeRounded)}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Success Rate</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {successRateRounded}%
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {stats?.total_attempts || payments.length} payment attempts
          </div>
        </div>

        {/* Paid Transactions */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Paid Orders</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.total_captured_count || payments.filter((p) => p.status === 'captured').length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Captured successfully
          </div>
        </div>

        {/* Failed Payments */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Failed Attempts</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.failed_count || payments.filter((p) => p.status === 'failed').length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Declined by bank or user
          </div>
        </div>
      </div>

      {/* 3. UNIFIED FILTER & SEARCH BAR */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Debounced Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Phone, Email, Amount, Transaction ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Contextual Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white focus:outline-none focus:border-black cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="captured">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Method */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white focus:outline-none focus:border-black cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="upi">UPI</option>
              <option value="card">Cards</option>
              <option value="netbanking">Netbanking</option>
              <option value="wallet">Wallets</option>
            </select>

            {/* Time Filter Pills */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yest' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id as TimeFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    timeFilter === t.id
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. UNIFIED PAYMENTS LIST TABLE (No WhatsApp CTA clutter) */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-neutral-300" />
            <div>No transactions match your active filter criteria.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                  <th className="py-3 px-5">Customer & Phone</th>
                  <th className="py-3 px-5">Payment Method</th>
                  <th className="py-3 px-5">Amount</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/70">
                {filteredPayments.map((p) => {
                  const amountRounded = Math.round(p.amount);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900">{p.email || p.contact || 'Customer'}</div>
                        <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          {p.contact || 'No phone'}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">{renderMethodBadge(p)}</td>

                      <td className="py-3.5 px-5">
                        <div className="font-extrabold text-neutral-900 text-sm">
                          {formatPrice(amountRounded)}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        {renderStatusBadge(p.status)}
                        {p.error_description && (
                          <div className="text-[10px] text-rose-600 font-medium max-w-xs truncate mt-0.5" title={p.error_description}>
                            {p.error_description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-neutral-500">
                        {formatDate(p.created_at)}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL: PAYMENT DETAILS (Clean, Zero Decimals, Zero WhatsApp CTA) */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neutral-700" />
                <h3 className="text-base font-extrabold text-neutral-900 font-heading">Payment Information</h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-xl hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Transaction ID:</span>
                <span className="font-mono font-bold text-neutral-900">{selectedPayment.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Amount Paid:</span>
                <span className="font-black text-neutral-900 text-sm">{formatPrice(Math.round(selectedPayment.amount))}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Status:</span>
                <span>{renderStatusBadge(selectedPayment.status)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Payment Method:</span>
                <span>{renderMethodBadge(selectedPayment)}</span>
              </div>
              {selectedPayment.contact && (
                <div className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">Customer Phone:</span>
                  <span className="font-bold text-neutral-900">{selectedPayment.contact}</span>
                </div>
              )}
              {selectedPayment.email && (
                <div className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">Customer Email:</span>
                  <span className="font-bold text-neutral-900">{selectedPayment.email}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Recorded At:</span>
                <span className="text-neutral-900">{formatDate(selectedPayment.created_at)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
