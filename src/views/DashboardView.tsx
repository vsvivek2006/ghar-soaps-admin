'use client';

import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import { formatPrice, formatDate } from '../lib/utils';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Truck,
  Clock,
  Sparkles,
  Download,
  Flame,
  MapPin,
  Calendar,
  Smartphone,
  ShieldCheck,
  Zap,
  BarChart3,
  DollarSign,
  Package,
} from 'lucide-react';

interface DashboardViewProps {
  orders: Order[];
  subscribersCount: number;
  registeredCustomersCount: number;
  onOpenOrder: (order: Order) => void;
  onChangeView: (view: any) => void;
  onExportCSV: () => void;
}

type TimeRange = 'all' | 'today' | 'yesterday' | '7d' | '30d';

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  subscribersCount,
  registeredCustomersCount,
  onOpenOrder,
  onChangeView,
  onExportCSV,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const sevenDaysAgo = now.getTime() - 7 * 86400000;
    const thirtyDaysAgo = now.getTime() - 30 * 86400000;

    return orders.filter((o) => {
      const orderTime = new Date(o.created_at).getTime();
      switch (timeRange) {
        case 'today':
          return orderTime >= startOfToday;
        case 'yesterday':
          return orderTime >= startOfYesterday && orderTime < startOfToday;
        case '7d':
          return orderTime >= sevenDaysAgo;
        case '30d':
          return orderTime >= thirtyDaysAgo;
        default:
          return true;
      }
    });
  }, [orders, timeRange]);

  // Aggregate executive metrics (100% Prepaid Model - Zero COD)
  const {
    totalRevenue,
    totalOrders,
    newOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    avgOrderValue,
    upiOrders,
    cardOrders,
    otherPrepaidOrders,
    recentOrders,
    topProducts,
    topStates,
    dailyTrends,
  } = useMemo(() => {
    let rev = 0;
    let confirmedCount = 0;
    let processingCount = 0;
    let shipped = 0;
    let delivered = 0;
    let upi = 0;
    let card = 0;
    let otherPrepaid = 0;

    const productMap = new Map<string, { title: string; count: number; revenue: number }>();
    const stateMap = new Map<string, number>();
    const dayMap = new Map<string, { count: number; revenue: number }>();

    // Prepare last 7 days buckets
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      dayMap.set(key, { count: 0, revenue: 0 });
    }

    for (const o of filteredOrders) {
      const orderTotal = Number(o.total) || 0;
      rev += orderTotal;

      if (o.status === 'Confirmed') confirmedCount++;
      else if (o.status === 'Processing') processingCount++;
      else if (o.status === 'Shipped' || o.status === 'Out for Delivery') shipped++;
      else if (o.status === 'Delivered') delivered++;

      // 100% Prepaid Method Breakdown
      const method = (o.payment_method || '').toLowerCase();
      if (method.includes('card')) {
        card++;
      } else if (method.includes('netbanking') || method.includes('wallet')) {
        otherPrepaid++;
      } else {
        // UPI is primary (default in India)
        upi++;
      }

      // States breakdown
      if (o.state) {
        const cleanState = o.state.trim();
        stateMap.set(cleanState, (stateMap.get(cleanState) || 0) + 1);
      }

      // Products breakdown
      if (Array.isArray(o.order_items)) {
        for (const item of o.order_items) {
          const title = item.title || 'Handcrafted Soap';
          const qty = Number(item.quantity) || 1;
          const itemRev = (Number(item.price) || 0) * qty;

          const current = productMap.get(title) || { title, count: 0, revenue: 0 };
          productMap.set(title, {
            title,
            count: current.count + qty,
            revenue: current.revenue + itemRev,
          });
        }
      }

      // Daily 7-day velocity
      const orderDate = new Date(o.created_at);
      const dayKey = orderDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      if (dayMap.has(dayKey)) {
        const cur = dayMap.get(dayKey)!;
        cur.count++;
        cur.revenue += orderTotal;
      }
    }

    // Sort Top 5 Products
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sort Top 5 States
    const sortedStates = Array.from(stateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([state, count]) => ({ state, count }));

    // Format daily trends
    const trends = Array.from(dayMap.entries()).map(([label, data]) => ({
      label,
      orders: data.count,
      revenue: data.revenue,
    }));

    const totalCount = filteredOrders.length;

    return {
      totalRevenue: rev,
      totalOrders: totalCount,
      newOrders: confirmedCount,
      processingOrders: processingCount,
      shippedOrders: shipped,
      deliveredOrders: delivered,
      avgOrderValue: totalCount > 0 ? Math.round(rev / totalCount) : 0,
      upiOrders: upi,
      cardOrders: card,
      otherPrepaidOrders: otherPrepaid,
      recentOrders: filteredOrders.slice(0, 7),
      topProducts: sortedProducts,
      topStates: sortedStates,
      dailyTrends: trends,
    };
  }, [filteredOrders]);

  // Max revenue in trend chart for scaling
  const maxDayRevenue = useMemo(() => {
    const max = Math.max(...dailyTrends.map((d) => d.revenue), 1000);
    return Math.ceil(max / 1000) * 1000;
  }, [dailyTrends]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. EXECUTIVE HERO BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-5 sm:p-7 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Prepaid Store Active
            </span>
            <span className="text-xs text-neutral-400">• Zero RTO Risk</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight font-heading">
            Ghar Soaps Executive Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Real-time sales velocity, 100% prepaid order fulfillment, and customer growth.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-2xl border border-neutral-200/60 self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id as TimeRange)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                timeRange === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS ROW (5 Cards - Exact Lifecycle) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Gross Sales"
          value={formatPrice(totalRevenue)}
          subtitle={timeRange === 'all' ? '100% Prepaid volume' : `Selected ${timeRange}`}
          icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="emerald"
        />
        <MetricCard
          title="Total Orders"
          value={totalOrders}
          subtitle={`Avg ${formatPrice(avgOrderValue)} / basket`}
          icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="amber"
        />
        <MetricCard
          title="New Orders"
          value={newOrders}
          subtitle="Confirmed & to be packed"
          icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="amber"
        />
        <MetricCard
          title="In Packing"
          value={processingOrders}
          subtitle="Soap batches packaging"
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="blue"
        />
        <MetricCard
          title="Dispatched"
          value={shippedOrders}
          subtitle={`${deliveredOrders} delivered`}
          icon={<Truck className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="purple"
        />
      </div>

      {/* 3. REVENUE TREND BAR CHART + 100% PREPAID BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* 7-Day Revenue Velocity Chart */}
        <div className="lg:col-span-2 bg-white/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  7-Day Sales Velocity Trend
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">Daily order volume & revenue performance</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Peak Velocity</span>
              <div className="text-xs sm:text-sm font-extrabold text-neutral-900">
                {formatPrice(Math.max(...dailyTrends.map((d) => d.revenue), 0))}
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-3 border-b border-neutral-100 pb-2">
              {dailyTrends.map((d, idx) => {
                const heightPercent = maxDayRevenue > 0 ? Math.round((d.revenue / maxDayRevenue) * 100) : 0;
                const isPeak = d.revenue > 0 && d.revenue === Math.max(...dailyTrends.map((item) => item.revenue));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-neutral-900 text-white text-[10px] py-1 px-2 rounded-lg font-bold whitespace-nowrap shadow-md z-10">
                      {formatPrice(d.revenue)} • {d.orders} orders
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full max-w-[36px] bg-neutral-100/80 rounded-t-xl h-full flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                            : 'bg-gradient-to-t from-neutral-700 to-neutral-500 group-hover:from-emerald-500 group-hover:to-teal-400'
                        }`}
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      />
                    </div>
                    {/* X-axis Label */}
                    <span className="text-[10px] sm:text-[11px] font-bold text-neutral-500 mt-2 truncate w-full text-center">
                      {d.label.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
            <span>Aggregated across confirmed prepaid transactions</span>
            <button
              onClick={() => onChangeView('payments')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Live Gateway Transactions &rarr;
            </button>
          </div>
        </div>

        {/* 100% PREPAID ONLY - ZERO COD POLICY CARD */}
        <div className="bg-white/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  100% Prepaid Model
                </h2>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                0% RTO Risk
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">Ghar Soaps operates strictly on 100% upfront prepaid</p>

            <div className="space-y-3 mt-4">
              {/* Prepaid Verified Summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span className="font-extrabold text-emerald-950">Prepaid Collection Rate</span>
                  </div>
                  <span className="font-extrabold text-emerald-800">100%</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-[11px] text-emerald-800 font-medium">{totalOrders} orders paid upfront</span>
                  <span className="text-sm font-extrabold text-emerald-900">{formatPrice(totalRevenue)}</span>
                </div>
                <div className="h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full w-full" />
                </div>
              </div>

              {/* Channel Split Sub-breakdown */}
              <div className="space-y-2 pt-1 text-xs">
                {/* UPI */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/50">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-neutral-600" />
                    <span className="font-bold text-neutral-800">UPI (GPay / PhonePe / Paytm)</span>
                  </div>
                  <span className="font-bold text-neutral-900">
                    {totalOrders > 0 ? Math.round((upiOrders / totalOrders) * 100) : 0}%
                  </span>
                </div>

                {/* Cards */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/50">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                    <span className="font-bold text-neutral-800">Debit / Credit Cards</span>
                  </div>
                  <span className="font-bold text-neutral-900">
                    {totalOrders > 0 ? Math.round((cardOrders / totalOrders) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick summary stat */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Average Order Basket:</span>
            <span className="font-extrabold text-neutral-900 font-mono text-sm">{formatPrice(avgOrderValue)}</span>
          </div>
        </div>
      </div>

      {/* 4. TOP PRODUCTS & GEOGRAPHIC INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Top 5 Products */}
        <div className="bg-white/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  Top Selling Products
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">Highest velocity catalog items</p>
              </div>
            </div>
            <button
              onClick={() => onChangeView('products')}
              className="text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
            >
              Catalog &rarr;
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">No product item data found for this period.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : idx === 1
                          ? 'bg-neutral-200 text-neutral-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-neutral-900 truncate">{p.title}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-neutral-900">{formatPrice(p.revenue)}</div>
                    <div className="text-[10px] text-neutral-400">{p.count} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customer States */}
        <div className="bg-white/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  Top Delivery States
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">Geographic demand distribution</p>
              </div>
            </div>
            <span className="text-xs text-neutral-400 font-medium">Pan-India Reach</span>
          </div>

          {topStates.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">No location data captured yet.</div>
          ) : (
            <div className="space-y-3 pt-1">
              {topStates.map((s, idx) => {
                const maxStateCount = topStates[0]?.count || 1;
                const statePercent = Math.round((s.count / maxStateCount) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-800">{s.state}</span>
                      <span className="font-extrabold text-neutral-900">{s.count} orders</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        style={{ width: `${statePercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. RECENT VERIFIED PREPAID ORDERS */}
      <div className="bg-white/85 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-neutral-200/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.025)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 font-heading">
              Recent Prepaid Orders
            </h2>
            <p className="text-xs text-neutral-400">Latest online transactions verified via Razorpay</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportCSV}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('orders')}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition cursor-pointer"
            >
              <span>View All ({orders.length})</span>
            </button>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">No orders found for this timeframe.</div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Total</th>
                  <th className="py-3 px-5">Payment Mode</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/70">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-3.5 px-5 font-bold font-mono text-neutral-900">#{order.id}</td>
                    <td className="py-3.5 px-5 font-bold text-neutral-900">{order.customer_name}</td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-neutral-900">{formatPrice(order.total)}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {order.payment_method || 'Prepaid (Online)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500">{formatDate(order.created_at)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
