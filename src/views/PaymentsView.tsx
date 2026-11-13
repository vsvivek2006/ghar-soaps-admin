'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Radio,
  DollarSign,
  Smartphone,
  Landmark,
  Wallet,
  X,
  Info,
  Package,
  MessageCircle,
  Filter,
  Calendar,
  Phone,
  RotateCcw,
} from 'lucide-react';
import {
  RazorpayLivePayment,
  RazorpayGatewayOrder,
  PaymentWebhookEvent,
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

type TabType = 'payments' | 'abandoned';
type TimeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

export const PaymentsView: React.FC<PaymentsViewProps> = ({ token, onOpenOrder }) => {
  // Initialize state instantly from in-memory cache if available (0ms loading)
  const cached = adminDataCache.getPayments();

  const [payments, setPayments] = useState<RazorpayLivePayment[]>(cached?.payments || []);
  const [gatewayOrders, setGatewayOrders] = useState<RazorpayGatewayOrder[]>(cached?.orders || []);
  const [stats, setStats] = useState<PaymentDashboardStats | null>(cached?.stats || null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(cached?.gateway_info || null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('payments');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'captured' | 'failed' | 'refunded'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'upi' | 'card' | 'netbanking' | 'wallet'>('all');

  // Live Auto-Polling Toggle
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Selected payment or order for detail modal
  const [selectedPayment, setSelectedPayment] = useState<RazorpayLivePayment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RazorpayGatewayOrder | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 1. Fetch live payment & order data from Admin API
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
        const o = json.data.orders || [];
        const s = json.data.stats || null;
        const g = json.data.gateway_info || null;

        setPayments(p);
        setGatewayOrders(o);
        setStats(s);
        setGatewayInfo(g);
        setLastRefreshedAt(new Date());

        // Update global cache
        adminDataCache.setPayments({
          payments: p,
          orders: o,
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
    // If not cached or older than 30s, fetch
    if (!adminDataCache.hasValidPayments()) {
      fetchPaymentData(Boolean(cached));
    }
  }, [fetchPaymentData, cached]);

  // Live auto-polling every 25 seconds if enabled
  useEffect(() => {
    if (!isLivePolling) return;
    const interval = setInterval(() => {
      fetchPaymentData(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [isLivePolling, fetchPaymentData]);

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

  // Filtered Abandoned Checkouts (Razorpay orders where customer dropped off)
  const filteredAbandonedOrders = useMemo(() => {
    return gatewayOrders.filter((ord) => {
      // Filter by time
      if (!isWithinTimeRange(ord.created_at)) return false;

      // Search query
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchId = ord.id.toLowerCase().includes(query);
        const matchReceipt = (ord.receipt || '').toLowerCase().includes(query);
        const matchPhone = (ord.customer_details?.phone || '').toLowerCase().includes(query);
        const matchEmail = (ord.customer_details?.email || '').toLowerCase().includes(query);
        const matchName = (ord.customer_details?.name || '').toLowerCase().includes(query);
        return matchId || matchReceipt || matchPhone || matchEmail || matchName;
      }

      return true;
    });
  }, [gatewayOrders, timeFilter, debouncedSearch]);

  // Sync / Reconcile All Orders Action
  const handleReconcileAll = async () => {
    if (!token) return;
    try {
      setIsReconciling(true);
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reconcile' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification(
          `Reconciliation finished: ${json.summary?.reconciled_orders || 0} orders synced!`
        );
        fetchPaymentData(true);
      } else {
        showNotification(json.error || 'Reconciliation failed', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Error during reconciliation', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  // WhatsApp Recovery Link Generator
  const generateWhatsAppRecoveryLink = (order: RazorpayGatewayOrder) => {
    const rawPhone = order.customer_details?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const name = order.customer_details?.name || 'Customer';
    const amount = (order.amount / 100).toFixed(0);

    const message = encodeURIComponent(
      `Namaste ${name} ji! 🌿\n\nGhar Soaps se baat kar rahe hain. Aapka ₹${amount} ka pure handmade ayurvedic soaps ka order checkout par pending reh gaya tha.\n\nKya aapko payment ya checkout me koi issue aaya? Hum aapki help kar sakte hain ya direct delivery confirm kar sakte hain! 🧼✨`
    );

    return `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  // Payment Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid & Verified
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Payment Failed
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

  // If cold loading without any cache:
  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="p-8 rounded-3xl bg-white/80 backdrop-blur-md border border-neutral-200/60 shadow-lg max-w-sm w-full">
          <GharLoader customTitle="Syncing Razorpay Gateway" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Toast feedback */}
      {feedbackMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-xs font-bold shadow-xl border flex items-center gap-2 transition ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedbackMsg.text}
        </div>
      )}

      {/* 1. CLEAN MERCHANT GATEWAY HEADER */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Razorpay Gateway
              </span>

              {gatewayInfo?.is_live && (
                <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  {gatewayInfo.masked_key}
                </span>
              )}

              <span className="text-xs text-neutral-400">
                • Synced: {lastRefreshedAt.toLocaleTimeString()}
              </span>

              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded-md border border-emerald-200/50 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Webhook Sync Verified
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 font-heading">
              Customer Payments & Checkout Recovery
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl">
              Track successful customer payments, monitor payment success rates, and recover dropped checkouts via WhatsApp.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live polling button */}
            <button
              onClick={() => setIsLivePolling((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isLivePolling
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                  : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:text-neutral-900'
              }`}
              title={isLivePolling ? 'Live auto-sync active' : 'Live auto-sync paused'}
            >
              <Radio className={`w-3.5 h-3.5 ${isLivePolling ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}`} />
              {isLivePolling ? 'Live Sync: On' : 'Live Sync: Off'}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchPaymentData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-neutral-500'}`} />
              Refresh
            </button>

            {/* Sync Gateway */}
            <button
              onClick={handleReconcileAll}
              disabled={isReconciling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Sync any unrecorded gateway payments with store database"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              {isReconciling ? 'Syncing...' : 'Sync Gateway'}
            </button>

            {/* Razorpay External Dashboard */}
            <a
              href="https://dashboard.razorpay.com/app/orders"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 transition"
            >
              <span>Razorpay Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE REVENUE & CHECKOUT METRICS */}
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
            ₹{(stats?.total_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            <span className="text-emerald-700 font-bold">{stats?.total_captured_count || 0}</span> paid orders
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
            ₹{(stats?.net_settlement_volume || stats?.total_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Est. fees: ₹{(stats?.estimated_fees || 0).toLocaleString('en-IN')}
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
            {stats?.success_rate ?? 100}%
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {stats?.total_attempts || 0} customer attempts
          </div>
        </div>

        {/* Checkouts Initiated */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Checkouts Started</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.total_orders_created ?? gatewayOrders.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Store checkout sessions
          </div>
        </div>

        {/* Uncompleted / Dropped Checkouts */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.025)]">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Dropped Checkouts</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {Math.max((stats?.total_orders_created || gatewayOrders.length) - (stats?.total_captured_count || payments.length), 0)}
          </div>
          <div className="text-xs text-rose-700 font-bold mt-1">
            Recoverable via WhatsApp
          </div>
        </div>
      </div>

      {/* 3. TABS & FILTER BAR (Clean & Jargon-Free) */}
      <div className="bg-white/85 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          {/* 2 Clean Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Customer Payments</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-white">
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('abandoned')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'abandoned'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Abandoned Checkouts & Recovery</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-700 text-white font-extrabold">
                {gatewayOrders.length}
              </span>
            </button>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
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

        {/* Search & Method Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Debounced Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'payments'
                  ? 'Search by Customer Phone, Email, Amount...'
                  : 'Search abandoned checkouts by Customer Phone or Name...'
              }
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
          {activeTab === 'payments' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-white focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Paid & Captured</option>
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
                <option value="upi">UPI (GPay/PhonePe)</option>
                <option value="card">Cards</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallets</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. TAB 1: CUSTOMER PAYMENTS TABLE */}
      {activeTab === 'payments' && (
        <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-neutral-300" />
              <div>No payments match your active filter criteria.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                    <th className="py-3 px-5">Customer & Contact</th>
                    <th className="py-3 px-5">Payment Method</th>
                    <th className="py-3 px-5">Amount</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Date & Time</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/70">
                  {filteredPayments.map((p) => {
                    const amountInRupees = p.amount / 100;
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-neutral-900">{p.email || p.contact || 'Customer'}</div>
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{p.contact || 'No phone'}</span>
                            {p.order_id && <span className="text-neutral-300">• #{p.order_id.slice(-8)}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-5">{renderMethodBadge(p)}</td>

                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-neutral-900 text-sm">
                            ₹{amountInRupees.toLocaleString('en-IN')}
                          </div>
                          {p.fee ? (
                            <div className="text-[10px] text-neutral-400">
                              Fee: ₹{(p.fee / 100).toFixed(2)}
                            </div>
                          ) : null}
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
                            View
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
      )}

      {/* 5. TAB 2: ABANDONED CHECKOUTS & 1-CLICK WHATSAPP RECOVERY */}
      {activeTab === 'abandoned' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 p-4 sm:p-5 rounded-3xl border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-emerald-950 font-heading">
                  1-Click WhatsApp Customer Recovery
                </h3>
              </div>
              <p className="text-xs text-emerald-900/80">
                These customers initiated checkout on your store but dropped off before paying. Win them back with 1 click!
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-800 bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0 self-start sm:self-auto shadow-2xs">
              {filteredAbandonedOrders.length} Checkouts Captured
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] overflow-hidden">
            {filteredAbandonedOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
                <Package className="w-8 h-8 mx-auto text-neutral-300" />
                <div>No abandoned checkout sessions found for this timeframe.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                      <th className="py-3 px-5">Customer Info</th>
                      <th className="py-3 px-5">Cart Value</th>
                      <th className="py-3 px-5">Checkout Status</th>
                      <th className="py-3 px-5">Created At</th>
                      <th className="py-3 px-5 text-right">Recovery Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100/70">
                    {filteredAbandonedOrders.map((ord) => {
                      const amount = ord.amount / 100;
                      const hasPhone = Boolean(ord.customer_details?.phone);
                      const isPaid = ord.status === 'paid';

                      return (
                        <tr key={ord.id} className="hover:bg-neutral-50/50 transition">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-neutral-900">
                              {ord.customer_details?.name || 'Shopper'}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5 flex items-center gap-2">
                              {ord.customer_details?.phone ? (
                                <span className="text-emerald-700 font-bold">{ord.customer_details.phone}</span>
                              ) : (
                                <span className="text-neutral-400">Phone not entered</span>
                              )}
                              {ord.customer_details?.email && (
                                <span className="text-neutral-400">• {ord.customer_details.email}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-5">
                            <span className="font-extrabold text-neutral-900 text-sm">
                              ₹{amount.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[10px] text-neutral-400">
                              {ord.attempts} payment attempt{ord.attempts !== 1 ? 's' : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Completed & Paid
                              </span>
                            ) : ord.attempts > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Attempted (Dropped)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                                Cart Abandoned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-neutral-500">
                            {formatDate(ord.created_at)}
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            {isPaid ? (
                              <span className="text-xs text-neutral-400 font-medium">Order Complete</span>
                            ) : hasPhone ? (
                              <a
                                href={generateWhatsAppRecoveryLink(ord)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Recover via WhatsApp</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(ord)}
                                className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
                              >
                                View Session
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: PAYMENT DETAILS */}
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
                <span className="font-black text-neutral-900 text-sm">₹{(selectedPayment.amount / 100).toFixed(2)}</span>
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
                  <span className="text-neutral-500">Customer Contact:</span>
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

      {/* 7. MODAL: ABANDONED CHECKOUT DETAILS */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-neutral-700" />
                <h3 className="text-base font-extrabold text-neutral-900 font-heading">Checkout Session</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-xl hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Session ID:</span>
                <span className="font-mono font-bold text-neutral-900">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Cart Amount:</span>
                <span className="font-black text-neutral-900 text-sm">₹{(selectedOrder.amount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Status:</span>
                <span className="font-bold text-neutral-800 uppercase">{selectedOrder.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-neutral-100">
                <span className="text-neutral-500">Attempts:</span>
                <span className="font-bold text-neutral-800">{selectedOrder.attempts}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">Created:</span>
                <span className="text-neutral-900">{formatDate(selectedOrder.created_at)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
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
