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
  Zap,
  Radio,
  FileCode,
  DollarSign,
  Smartphone,
  Landmark,
  Wallet,
  ChevronRight,
  X,
  Info,
  Package,
  MessageCircle,
  Filter,
  Calendar,
  Percent,
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

interface PaymentsViewProps {
  token: string | null;
  onOpenOrder?: (order: any) => void;
}

type TabType = 'payments' | 'orders' | 'webhooks';
type TimeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

export const PaymentsView: React.FC<PaymentsViewProps> = ({ token, onOpenOrder }) => {
  const [payments, setPayments] = useState<RazorpayLivePayment[]>([]);
  const [gatewayOrders, setGatewayOrders] = useState<RazorpayGatewayOrder[]>([]);
  const [events, setEvents] = useState<PaymentWebhookEvent[]>([]);
  const [stats, setStats] = useState<PaymentDashboardStats | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('payments');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'captured' | 'failed' | 'refunded' | 'authorized'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'upi' | 'card' | 'netbanking' | 'wallet'>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'created' | 'attempted' | 'paid'>('all');

  // Live Auto-Polling Toggle
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected payment or event for detail modal
  const [selectedPayment, setSelectedPayment] = useState<RazorpayLivePayment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<RazorpayGatewayOrder | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PaymentWebhookEvent | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
      showNotification(`Copied ${label} to clipboard!`);
    }
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
        setPayments(json.data.payments || []);
        setGatewayOrders(json.data.orders || []);
        setEvents(json.data.events || []);
        setStats(json.data.stats || null);
        setGatewayInfo(json.data.gateway_info || null);
        setLastRefreshedAt(new Date());
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
    fetchPaymentData(false);
  }, [fetchPaymentData]);

  // Live auto-polling every 15 seconds if enabled
  useEffect(() => {
    if (!isLivePolling) return;
    const interval = setInterval(() => {
      fetchPaymentData(true);
    }, 15000);
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
      const q = debouncedSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        (p.order_id && p.order_id.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.vpa && p.vpa.toLowerCase().includes(q)) ||
        (p.bank && p.bank.toLowerCase().includes(q)) ||
        (p.order?.customer_name && p.order.customer_name.toLowerCase().includes(q)) ||
        (p.order?.id && p.order.id.toLowerCase().includes(q)) ||
        (p.order?.tracking_number && p.order.tracking_number.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchMethod = methodFilter === 'all' || p.method === methodFilter;
      const matchTime = isWithinTimeRange(p.created_at);

      return matchSearch && matchStatus && matchMethod && matchTime;
    });
  }, [payments, debouncedSearch, statusFilter, methodFilter, timeFilter]);

  // Filtered Razorpay Orders (Footprint)
  const filteredGatewayOrders = useMemo(() => {
    return gatewayOrders.filter((o) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.receipt && o.receipt.toLowerCase().includes(q)) ||
        (o.order?.customer_name && o.order.customer_name.toLowerCase().includes(q)) ||
        (o.order?.phone && o.order.phone.toLowerCase().includes(q)) ||
        (o.order?.id && o.order.id.toLowerCase().includes(q));

      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const matchTime = isWithinTimeRange(o.created_at);

      return matchSearch && matchStatus && matchTime;
    });
  }, [gatewayOrders, debouncedSearch, orderStatusFilter, timeFilter]);

  // Filtered Webhook Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        ev.event_id.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q) ||
        (ev.razorpay_order_id && ev.razorpay_order_id.toLowerCase().includes(q)) ||
        (ev.razorpay_payment_id && ev.razorpay_payment_id.toLowerCase().includes(q)) ||
        (ev.contact && ev.contact.toLowerCase().includes(q)) ||
        (ev.vpa && ev.vpa.toLowerCase().includes(q));

      const matchTime = isWithinTimeRange(ev.processed_at);

      return matchSearch && matchTime;
    });
  }, [events, debouncedSearch, timeFilter]);

  // Reconcile pending orders against captured payments
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
        body: JSON.stringify({ action: 'reconcile_all' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification(json.message || 'Orders successfully reconciled with gateway!');
        await fetchPaymentData(false);
      } else {
        showNotification(json.error || 'Reconciliation failed', 'error');
      }
    } catch {
      showNotification('Error during reconciliation', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleReconcileSingle = async (paymentId: string, orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reconcile_single', paymentId, orderId }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification(`Order #${orderId} marked as Confirmed & Paid!`);
        setSelectedPayment(null);
        await fetchPaymentData(false);
      } else {
        showNotification(json.error || 'Failed to update order', 'error');
      }
    } catch {
      showNotification('Error updating order', 'error');
    }
  };

  const renderMethodBadge = (method: string, p?: RazorpayLivePayment) => {
    switch (method?.toLowerCase()) {
      case 'upi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            UPI {p?.vpa ? `(${p.vpa})` : ''}
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
            Netbanking {p?.bank ? `(${p.bank})` : ''}
          </span>
        );
      case 'wallet':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Wallet className="w-3.5 h-3.5 text-amber-600" />
            Wallet {p?.wallet ? `(${p.wallet})` : ''}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
            {method || 'Online'}
          </span>
        );
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'captured':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Captured
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Failed
          </span>
        );
      case 'authorized':
      case 'attempted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Attempted
          </span>
        );
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            Created
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {feedbackMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-bounce ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedbackMsg.text}
        </div>
      )}

      {/* Gateway Status Header */}
      <div className="bg-neutral-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-neutral-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Razorpay Gateway
              </span>

              {gatewayInfo?.is_live && (
                <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                  {gatewayInfo.masked_key}
                </span>
              )}

              <span className="text-xs text-neutral-400">
                • Last synced: {lastRefreshedAt.toLocaleTimeString()}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Razorpay Real-Time Gateway & Funnel
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
              Track live customer checkouts, gateway footprint, UPI/Card authorizations, and cryptographic webhook events.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live polling button */}
            <button
              onClick={() => setIsLivePolling((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLivePolling
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
              }`}
              title={isLivePolling ? 'Auto-polling active (every 15s)' : 'Auto-polling paused'}
            >
              <Radio className={`w-3.5 h-3.5 ${isLivePolling ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
              {isLivePolling ? 'Live Stream: On' : 'Live Stream: Off'}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchPaymentData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh
            </button>

            {/* Reconcile Orders */}
            <button
              onClick={handleReconcileAll}
              disabled={isReconciling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Sync all captured Razorpay payments with database orders"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              {isReconciling ? 'Reconciling...' : 'Reconcile Orders'}
            </button>

            {/* Razorpay External Dashboard */}
            <a
              href="https://dashboard.razorpay.com/app/orders"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
            >
              <span>Razorpay Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Senior Executive Metrics (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Gross Volume */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Volume</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            ₹{(stats?.total_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats?.total_captured_count || 0}</span> captured payments
          </div>
        </div>

        {/* Net Settlement (After 2.36% fee) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Payout</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900">
            ₹{(stats?.net_settlement_volume || stats?.total_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Est. fee: ₹{(stats?.estimated_fees || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.success_rate ?? 100}%
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {stats?.total_attempts || 0} payment attempts
          </div>
        </div>

        {/* Checkout Orders Footprint */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders Initiated</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.total_orders_created ?? gatewayOrders.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Razorpay orders created
          </div>
        </div>

        {/* Failed Attempts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed / Drops</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.failed_count || 0}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Customer declines or drops
          </div>
        </div>
      </div>

      {/* Webhook Configuration & Setup Card */}
      <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-700" />
              <h2 className="text-sm font-bold text-amber-950">
                Razorpay Webhook Configuration Guide
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 uppercase">
                Active Setup
              </span>
            </div>
            <p className="text-xs text-amber-900/80 max-w-3xl">
              To receive instant payment confirmations in real-time, ensure this Webhook URL and Secret are set in your Razorpay Dashboard under{' '}
              <span className="font-semibold text-amber-950">Settings &gt; Webhooks</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="https://dashboard.razorpay.com/app/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition shadow-xs"
            >
              <span>Open Razorpay Webhooks</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Copy-paste credentials */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-white/90 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Webhook URL</div>
              <div className="font-mono text-neutral-900 truncate select-all">
                {gatewayInfo?.webhook_url || 'https://gharsoap.shop/api/payments/webhook'}
              </div>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  gatewayInfo?.webhook_url || 'https://gharsoap.shop/api/payments/webhook',
                  'Webhook URL'
                )
              }
              className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition shrink-0 cursor-pointer"
              title="Copy Webhook URL"
            >
              {copiedKey === 'Webhook URL' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-white/90 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Webhook Secret</div>
              <div className="font-mono text-neutral-900 truncate select-all">
                {gatewayInfo?.webhook_secret || (gatewayInfo?.webhook_secret_configured ? 'Configured in .env / Vercel' : 'Not configured')}
              </div>
            </div>
            {gatewayInfo?.webhook_secret && (
              <button
                onClick={() => copyToClipboard(gatewayInfo.webhook_secret!, 'Webhook Secret')}
                className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition shrink-0 cursor-pointer"
                title="Copy Webhook Secret"
              >
                {copiedKey === 'Webhook Secret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          {/* 3 Dedicated Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Live Payments (pay_...)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-white">
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Checkout Orders Footprint (order_...)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-white">
                {gatewayOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'webhooks'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Webhook Events Audit</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-white">
                {events.length}
              </span>
            </button>
          </div>

          {/* Quick counts */}
          <div className="text-xs text-neutral-500 font-medium whitespace-nowrap">
            Showing{' '}
            {activeTab === 'payments'
              ? filteredPayments.length
              : activeTab === 'orders'
              ? filteredGatewayOrders.length
              : filteredEvents.length}{' '}
            records
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID (pay_..., order_...), name, phone, email, VPA, bank..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="text-xs rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-900 transition"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Tab-specific Filters */}
          {activeTab === 'payments' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-900 transition"
              >
                <option value="all">All Payment Statuses</option>
                <option value="captured">Captured</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="authorized">Authorized</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                className="text-xs rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-900 transition"
              >
                <option value="all">All Payment Methods</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="card">Debit / Credit Card</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallets</option>
              </select>
            </>
          )}

          {activeTab === 'orders' && (
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as any)}
              className="text-xs rounded-xl border border-neutral-200 px-3 py-2 bg-white text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-900 transition"
            >
              <option value="all">All Order Statuses</option>
              <option value="created">Created (Awaiting Payment)</option>
              <option value="attempted">Attempted</option>
              <option value="paid">Paid</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: LIVE PAYMENTS TABLE */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <div>Fetching live gateway payments from Razorpay...</div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-neutral-300" />
              <div className="font-bold text-neutral-700">No payment attempts match this filter.</div>
              <p>When customers attempt payment via UPI or Card, they appear here live.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-4">Payment ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Store Order</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.map((p) => {
                    const phone = p.contact || p.order?.phone;
                    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          <button
                            onClick={() => copyToClipboard(p.id, 'Payment ID')}
                            className="hover:underline flex items-center gap-1"
                            title="Click to copy"
                          >
                            <span>{p.id}</span>
                            <Copy className="w-3 h-3 text-neutral-400" />
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">
                            {p.order?.customer_name || p.email || 'Customer'}
                          </div>
                          <div className="text-[11px] text-neutral-400">{phone || p.email || '—'}</div>
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-neutral-900 font-mono">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">{renderMethodBadge(p.method, p)}</td>

                        <td className="py-3.5 px-4">
                          {renderStatusBadge(p.status)}
                          {p.status === 'failed' && (
                            <div className="text-[10px] text-rose-600 truncate max-w-[140px] mt-0.5">
                              {p.error_description || p.error_reason || 'Declined'}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {p.order ? (
                            <button
                              onClick={() => onOpenOrder && onOpenOrder(p.order)}
                              className="font-mono text-emerald-700 hover:underline font-bold text-xs"
                            >
                              #{p.order.id}
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">Unlinked</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                          {formatDate(p.created_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp recovery for failed payments */}
                            {cleanPhone && p.status === 'failed' && (
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                  `Hi! We noticed your Ghar Soaps order payment of ₹${p.amount} could not be completed. Would you like assistance to complete it?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                title="Contact customer on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => setSelectedPayment(p)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition"
                            >
                              Inspect
                            </button>
                          </div>
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

      {/* TAB 2: CHECKOUT ORDERS FOOTPRINT (order_...) */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/50 border-b border-amber-200/50 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Razorpay Orders Footprint:</strong> Shows every official checkout session created in Razorpay.
                Orders with status <strong>created</strong> were initiated by customers but haven't been paid yet (abandoned checkout).
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <div>Fetching Razorpay orders from gateway...</div>
            </div>
          ) : filteredGatewayOrders.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs space-y-2">
              <Package className="w-8 h-8 mx-auto text-neutral-300" />
              <div className="font-bold text-neutral-700">No Razorpay orders found.</div>
              <p>When customers proceed to checkout, created order entities appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-4">Razorpay Order ID</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Attempts</th>
                    <th className="py-3.5 px-4">Store Order</th>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Recovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredGatewayOrders.map((ord) => {
                    const phone = ord.order?.phone || ord.notes?.phone;
                    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
                    return (
                      <tr key={ord.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                          <button
                            onClick={() => copyToClipboard(ord.id, 'Order ID')}
                            className="hover:underline flex items-center gap-1"
                            title="Click to copy"
                          >
                            <span>{ord.id}</span>
                            <Copy className="w-3 h-3 text-neutral-400" />
                          </button>
                          <div className="text-[10px] text-neutral-400 font-mono">Receipt: {ord.receipt}</div>
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-neutral-900 font-mono">
                          ₹{ord.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">{renderStatusBadge(ord.status)}</td>

                        <td className="py-3.5 px-4 font-mono text-neutral-700">
                          {ord.attempts} {ord.attempts === 1 ? 'attempt' : 'attempts'}
                        </td>

                        <td className="py-3.5 px-4">
                          {ord.order ? (
                            <button
                              onClick={() => onOpenOrder && onOpenOrder(ord.order)}
                              className="font-mono text-emerald-700 hover:underline font-bold text-xs"
                            >
                              #{ord.order.id}
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">{ord.order?.customer_name || 'Customer'}</div>
                          <div className="text-[11px] text-neutral-400">{phone || '—'}</div>
                        </td>

                        <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                          {formatDate(ord.created_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                `Hi ${ord.order?.customer_name || ''}! We noticed you started an order of ₹${ord.amount} on Ghar Soaps. Would you like assistance to complete it?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-2xs"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">—</span>
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
      )}

      {/* TAB 3: WEBHOOK AUDIT STREAM */}
      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs">
              No webhook events recorded yet. Webhooks verified by HMAC SHA-256 will appear here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-4">Event ID</th>
                    <th className="py-3.5 px-4">Event Type</th>
                    <th className="py-3.5 px-4">Payment ID</th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Processed At</th>
                    <th className="py-3.5 px-4 text-right">JSON Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.event_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-neutral-900">{ev.event_id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700">{ev.razorpay_payment_id || '—'}</td>
                      <td className="py-3.5 px-4 text-neutral-600">{ev.razorpay_order_id || '—'}</td>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {ev.amount ? `₹${(ev.amount / 100).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500">{formatDate(ev.processed_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold font-sans text-xs transition"
                        >
                          View Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECTOR MODAL: Payment Details */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-neutral-900">Payment Breakdown</h3>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 rounded-xl">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Payment ID</span>
                  <div className="font-mono font-bold text-neutral-900 select-all">{selectedPayment.id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Amount</span>
                  <div className="font-mono font-extrabold text-neutral-900 text-sm">
                    ₹{selectedPayment.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Gateway Status</span>
                  <div>{renderStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Method</span>
                  <div>{renderMethodBadge(selectedPayment.method, selectedPayment)}</div>
                </div>
              </div>

              {selectedPayment.order_id && (
                <div className="p-3 bg-neutral-50 rounded-xl space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Razorpay Order ID</span>
                  <div className="font-mono text-neutral-900 select-all">{selectedPayment.order_id}</div>
                </div>
              )}

              {selectedPayment.order && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold">Linked Store Order</span>
                    <span className="font-bold text-emerald-900">#{selectedPayment.order.id}</span>
                  </div>
                  <div className="text-neutral-700 font-semibold">{selectedPayment.order.customer_name}</div>
                  <div className="text-neutral-500">{selectedPayment.order.phone}</div>
                </div>
              )}

              {selectedPayment.error_description && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <span className="text-[10px] text-rose-700 uppercase font-bold">Decline Reason</span>
                  <div className="text-rose-900 font-semibold">{selectedPayment.error_description}</div>
                  {selectedPayment.error_code && (
                    <div className="text-[10px] text-rose-600 font-mono">Code: {selectedPayment.error_code}</div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              {selectedPayment.order && selectedPayment.order.payment_status !== 'paid' && selectedPayment.status === 'captured' && (
                <button
                  onClick={() => handleReconcileSingle(selectedPayment.id, selectedPayment.order!.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Mark Order as Paid
                </button>
              )}
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs ml-auto transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTOR MODAL: Webhook Event JSON Payload */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-neutral-900">Webhook Event Raw Payload</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 bg-neutral-900 text-emerald-400 text-xs rounded-xl font-mono overflow-x-auto select-all">
                {JSON.stringify(selectedEvent.payload || selectedEvent, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
