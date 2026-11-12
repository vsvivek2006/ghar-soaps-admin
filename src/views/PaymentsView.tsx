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
} from 'lucide-react';
import { RazorpayLivePayment, PaymentWebhookEvent, PaymentDashboardStats, GatewayInfo } from '../types';

interface PaymentsViewProps {
  token: string | null;
  onOpenOrder?: (order: any) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ token, onOpenOrder }) => {
  const [payments, setPayments] = useState<RazorpayLivePayment[]>([]);
  const [events, setEvents] = useState<PaymentWebhookEvent[]>([]);
  const [stats, setStats] = useState<PaymentDashboardStats | null>(null);
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'webhooks'>('payments');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'captured' | 'failed' | 'refunded' | 'authorized'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'upi' | 'card' | 'netbanking' | 'wallet'>('all');

  // Live Auto-Polling Toggle
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected payment or event for detail modal
  const [selectedPayment, setSelectedPayment] = useState<RazorpayLivePayment | null>(null);
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

  // 1. Fetch live payment data from Admin Next.js API
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

  // Single order reconciliation
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

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        (p.order_id && p.order_id.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.vpa && p.vpa.toLowerCase().includes(q)) ||
        (p.order?.customer_name && p.order.customer_name.toLowerCase().includes(q)) ||
        (p.order?.id && p.order.id.toLowerCase().includes(q)) ||
        (p.order?.tracking_number && p.order.tracking_number.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchMethod = methodFilter === 'all' || p.method === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, searchQuery, statusFilter, methodFilter]);

  // Filtered Webhook Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        ev.event_id.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q) ||
        (ev.razorpay_order_id && ev.razorpay_order_id.toLowerCase().includes(q)) ||
        (ev.razorpay_payment_id && ev.razorpay_payment_id.toLowerCase().includes(q))
      );
    });
  }, [events, searchQuery]);

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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Authorized
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
      <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-neutral-800 relative overflow-hidden">
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
              Razorpay Real-Time Payment Feed
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
              Track customer payments, UPI/Card authorizations, and automated webhook settlement events in real-time.
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
              href="https://dashboard.razorpay.com/app/payments"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition"
            >
              <span>Razorpay App</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gateway Volume</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            ₹{(stats?.total_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{stats?.total_captured_count || 0}</span> captured transactions
          </div>
        </div>

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
            Out of {stats?.total_attempts || 0} total attempts
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed Attempts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            {stats?.failed_count || 0}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Payment declines or customer drops
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Refunded Total</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900">
            ₹{(stats?.refunded_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {stats?.refunded_count || 0} refund processed
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
              To receive instant payment confirmations in real-time, add this Webhook URL and Secret inside your Razorpay Dashboard under{' '}
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
                gharsoaps_live_wh_sec_2026_9f8e7d
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('gharsoaps_live_wh_sec_2026_9f8e7d', 'Webhook Secret')}
              className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition shrink-0 cursor-pointer"
              title="Copy Webhook Secret"
            >
              {copiedKey === 'Webhook Secret' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Recommended events */}
        <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center gap-2 flex-wrap text-[11px] text-amber-900/80">
          <span className="font-semibold text-amber-950">Select these Active Events:</span>
          {['payment.captured', 'payment.failed', 'payment.authorized', 'order.paid', 'refund.processed'].map((evt) => (
            <span key={evt} className="bg-amber-100/90 text-amber-900 font-mono px-2 py-0.5 rounded border border-amber-200">
              {evt}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Live Payments</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-white">
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
          <div className="text-xs text-neutral-500 font-medium">
            Showing {activeTab === 'payments' ? filteredPayments.length : filteredEvents.length} records
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Payment ID (pay_...), Order ID, Customer name, phone, or VPA..."
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

          {activeTab === 'payments' && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white font-medium text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Captured (Success)</option>
                <option value="authorized">Authorized</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white font-medium text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
              >
                <option value="all">All Payment Methods</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="card">Credit / Debit Cards</option>
                <option value="netbanking">Netbanking</option>
                <option value="wallet">Wallets</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'payments' ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Connecting to Live Gateway...
              </div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">No payment transactions found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || methodFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Your live Razorpay gateway is ready. Incoming customer transactions will appear here instantly.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-600 font-semibold tracking-wider uppercase text-[11px]">
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Store Order</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800 font-normal">
                  {filteredPayments.map((p) => {
                    const isLinked = Boolean(p.order);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                        {/* Payment ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="select-all">{p.id}</span>
                            <button
                              onClick={() => copyToClipboard(p.id, 'Payment ID')}
                              className="text-neutral-400 hover:text-black p-0.5 rounded transition"
                              title="Copy Payment ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {p.order_id && (
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              rzp: {p.order_id}
                            </div>
                          )}
                        </td>

                        {/* Store Order */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isLinked ? (
                            <div>
                              <div className="font-semibold text-neutral-900 flex items-center gap-1">
                                <span>#{p.order?.id}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-normal">
                                  {p.order?.status}
                                </span>
                              </div>
                              {p.order?.tracking_number && (
                                <div className="text-[10px] text-neutral-500 font-mono">
                                  Track: {p.order.tracking_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-500">
                              Direct / Unlinked
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-neutral-900">
                            {p.order?.customer_name || p.email || 'Guest Customer'}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {p.contact || p.order?.phone || 'No phone'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-neutral-900">
                            ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          {p.amount_refunded > 0 && (
                            <div className="text-[10px] text-purple-600 font-medium">
                              -₹{p.amount_refunded} refunded
                            </div>
                          )}
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderMethodBadge(p.method, p)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(p.status)}
                          {p.status === 'failed' && p.error_description && (
                            <div className="text-[10px] text-rose-600 max-w-xs truncate mt-0.5" title={p.error_description}>
                              {p.error_description}
                            </div>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                          {new Date(p.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition cursor-pointer"
                            >
                              Details
                            </button>
                            <a
                              href={`https://dashboard.razorpay.com/app/payments/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                              title="Open in Razorpay Dashboard"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
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
      ) : (
        /* Webhook Events Audit View */
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">No webhook audit events yet</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                When Razorpay delivers webhook event notifications to{' '}
                <span className="font-mono text-neutral-700">/api/payments/webhook</span>, their cryptographic payload
                and execution audit will be logged here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-600 font-semibold tracking-wider uppercase text-[11px]">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Gateway Payment ID</th>
                    <th className="py-3 px-4">Gateway Order ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method / Channel</th>
                    <th className="py-3 px-4">Processed At</th>
                    <th className="py-3 px-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800 font-normal">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.event_id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="select-all">{ev.event_id.slice(0, 18)}...</span>
                          <button
                            onClick={() => copyToClipboard(ev.event_id, 'Event ID')}
                            className="text-neutral-400 hover:text-black p-0.5 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white font-mono">
                          {ev.event_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-neutral-700">
                        {ev.razorpay_payment_id || '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-neutral-700">
                        {ev.razorpay_order_id || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-neutral-900">
                        {ev.amount ? `₹${Number(ev.amount).toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ev.method ? (
                          <span className="uppercase text-[11px] font-semibold text-neutral-700">
                            {ev.method} {ev.bank ? `(${ev.bank})` : ''} {ev.vpa ? `(${ev.vpa})` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 text-[11px]">
                        {new Date(ev.processed_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition cursor-pointer"
                        >
                          View JSON
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

      {/* Selected Payment Detail Drawer / Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Payment Breakdown</h3>
                  <div className="font-mono text-xs text-neutral-500">{selectedPayment.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status and Amount Card */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider mb-1">
                    Amount Paid
                  </div>
                  <div className="text-2xl font-black text-neutral-900">
                    ₹{selectedPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>{renderStatusBadge(selectedPayment.status)}</div>
              </div>

              {/* Linked Store Order info */}
              {selectedPayment.order ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                      Linked Store Order
                    </span>
                    <span className="font-bold text-emerald-900">#{selectedPayment.order.id}</span>
                  </div>
                  <div className="text-neutral-700 space-y-0.5">
                    <div>
                      <span className="font-medium text-neutral-900">Customer:</span> {selectedPayment.order.customer_name}
                    </div>
                    <div>
                      <span className="font-medium text-neutral-900">Phone:</span> {selectedPayment.order.phone}
                    </div>
                    <div>
                      <span className="font-medium text-neutral-900">Order Status:</span>{' '}
                      <span className="font-semibold">{selectedPayment.order.status}</span> ({selectedPayment.order.payment_status})
                    </div>
                  </div>

                  {selectedPayment.order.payment_status === 'pending_payment' && selectedPayment.status === 'captured' && (
                    <button
                      onClick={() => handleReconcileSingle(selectedPayment.id, selectedPayment.order!.id)}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Reconcile & Confirm Order Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-neutral-500">
                  <Info className="w-4 h-4 inline mr-1 text-neutral-400" />
                  This payment was processed directly or has not been linked to a store order.
                </div>
              )}

              {/* Technical Details */}
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
                <div className="p-3 flex justify-between">
                  <span className="text-neutral-500">Method</span>
                  <span className="font-semibold text-neutral-900 uppercase">{selectedPayment.method}</span>
                </div>

                {selectedPayment.vpa && (
                  <div className="p-3 flex justify-between">
                    <span className="text-neutral-500">UPI VPA</span>
                    <span className="font-mono font-medium text-neutral-900">{selectedPayment.vpa}</span>
                  </div>
                )}

                {selectedPayment.card && (
                  <div className="p-3 flex justify-between">
                    <span className="text-neutral-500">Card</span>
                    <span className="font-medium text-neutral-900">
                      {selectedPayment.card.network} •••• {selectedPayment.card.last4} ({selectedPayment.card.type})
                    </span>
                  </div>
                )}

                {selectedPayment.bank && (
                  <div className="p-3 flex justify-between">
                    <span className="text-neutral-500">Bank</span>
                    <span className="font-medium text-neutral-900">{selectedPayment.bank}</span>
                  </div>
                )}

                {selectedPayment.order_id && (
                  <div className="p-3 flex justify-between">
                    <span className="text-neutral-500">Razorpay Order ID</span>
                    <span className="font-mono text-neutral-900">{selectedPayment.order_id}</span>
                  </div>
                )}

                <div className="p-3 flex justify-between">
                  <span className="text-neutral-500">Customer Contact</span>
                  <span className="font-medium text-neutral-900">{selectedPayment.contact || 'N/A'}</span>
                </div>

                <div className="p-3 flex justify-between">
                  <span className="text-neutral-500">Customer Email</span>
                  <span className="font-medium text-neutral-900">{selectedPayment.email || 'N/A'}</span>
                </div>

                {selectedPayment.error_code && (
                  <div className="p-3 bg-rose-50 text-rose-800">
                    <div className="font-bold text-rose-900">Failure Reason: {selectedPayment.error_code}</div>
                    <div className="mt-0.5">{selectedPayment.error_description}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <a
                href={`https://dashboard.razorpay.com/app/payments/${selectedPayment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition"
              >
                <span>Inspect in Razorpay</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Webhook Event JSON Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Webhook Event Payload: <span className="font-mono text-emerald-600">{selectedEvent.event_type}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-neutral-900 text-neutral-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed select-all">
              <pre>{JSON.stringify(selectedEvent.payload || selectedEvent, null, 2)}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(selectedEvent.payload || selectedEvent, null, 2),
                    'Payload JSON'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Payload JSON
              </button>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white transition"
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
