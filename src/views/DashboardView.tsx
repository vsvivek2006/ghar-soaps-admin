'use client';

import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatPrice, formatDate } from '../lib/utils';
import {
  DollarSign,
  Package,
  Clock,
  Truck,
  ShoppingBag,
  ExternalLink,
  Download,
  Eye,
  ArrowRight,
  Phone,
  UserCheck,
  Tag,
  Sparkles,
  TrendingUp,
  Calendar,
  CreditCard,
  Smartphone,
  Landmark,
  MapPin,
  Flame,
  Award,
  ChevronRight,
  BarChart3,
  Percent,
} from 'lucide-react';
import { ViewType } from '../components/Sidebar';

interface DashboardViewProps {
  orders: Order[];
  subscribersCount: number;
  registeredCustomersCount?: number;
  onOpenOrder: (order: Order) => void;
  onChangeView: (view: ViewType) => void;
  onExportCSV: () => void;
}

type TimeRange = 'all' | 'today' | 'yesterday' | '7d' | '30d';

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  subscribersCount,
  registeredCustomersCount = 0,
  onOpenOrder,
  onChangeView,
  onExportCSV,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter orders by selected time range
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

  // Aggregate executive metrics
  const {
    totalRevenue,
    totalOrders,
    pendingOrders,
    shippedOrders,
    deliveredOrders,
    avgOrderValue,
    codOrders,
    prepaidOrders,
    prepaidRevenue,
    codRevenue,
    recentOrders,
    topProducts,
    topStates,
    dailyTrends,
  } = useMemo(() => {
    let rev = 0;
    let pending = 0;
    let shipped = 0;
    let delivered = 0;
    let cod = 0;
    let codRev = 0;
    let prepaidRev = 0;

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

      if (o.status === 'Confirmed' || o.status === 'Processing') pending++;
      else if (o.status === 'Shipped' || o.status === 'Out for Delivery') shipped++;
      else if (o.status === 'Delivered') delivered++;

      const isCod = (o.payment_method || '').toLowerCase().includes('cod');
      if (isCod) {
        cod++;
        codRev += orderTotal;
      } else {
        prepaidRev += orderTotal;
      }

      // States breakdown
      if (o.state) {
        const cleanState = o.state.trim();
        stateMap.set(cleanState, (stateMap.get(cleanState) || 0) + 1);
      }

      // Product sales breakdown
      if (Array.isArray(o.order_items)) {
        for (const item of o.order_items) {
          const itemKey = item.title || 'Product';
          const existing = productMap.get(itemKey) || { title: itemKey, count: 0, revenue: 0 };
          existing.count += item.quantity || 1;
          existing.revenue += (Number(item.price) || 0) * (item.quantity || 1);
          productMap.set(itemKey, existing);
        }
      }

      // Day trend
      const d = new Date(o.created_at);
      const dayKey = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      if (dayMap.has(dayKey)) {
        const cur = dayMap.get(dayKey)!;
        cur.count++;
        cur.revenue += orderTotal;
      }
    }

    const totalCount = filteredOrders.length;
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sortedStates = Array.from(stateMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const trendsList = Array.from(dayMap.entries()).map(([day, val]) => ({
      day,
      count: val.count,
      revenue: val.revenue,
    }));

    return {
      totalRevenue: rev,
      totalOrders: totalCount,
      pendingOrders: pending,
      shippedOrders: shipped,
      deliveredOrders: delivered,
      avgOrderValue: totalCount > 0 ? Math.round(rev / totalCount) : 0,
      codOrders: cod,
      prepaidOrders: totalCount - cod,
      prepaidRevenue: prepaidRev,
      codRevenue: codRev,
      recentOrders: filteredOrders.slice(0, 7),
      topProducts: sortedProducts,
      topStates: sortedStates,
      dailyTrends: trendsList,
    };
  }, [filteredOrders]);

  const maxDayRevenue = useMemo(() => {
    return Math.max(...dailyTrends.map((t) => t.revenue), 1000);
  }, [dailyTrends]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & TIME FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-neutral-900 font-heading">
              Store Performance & Executive Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 tracking-wide">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Holistic snapshot of revenue, fulfillment velocity, and customer transactions
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100/90 rounded-2xl border border-neutral-200/60 self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id as TimeRange)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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

      {/* 2. EXECUTIVE METRICS ROW (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Gross Sales"
          value={formatPrice(totalRevenue)}
          subtitle={timeRange === 'all' ? 'All-time volume' : `For selected ${timeRange}`}
          icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="emerald"
        />
        <MetricCard
          title="Total Orders"
          value={totalOrders}
          subtitle={`Avg ${formatPrice(avgOrderValue)} / order`}
          icon={<ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="blue"
        />
        <MetricCard
          title="Prepaid Volume"
          value={formatPrice(prepaidRevenue)}
          subtitle={`${prepaidOrders} prepaid orders`}
          icon={<CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="purple"
        />
        <MetricCard
          title="To Be Dispatched"
          value={pendingOrders}
          subtitle="Awaiting courier pickup"
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="amber"
        />
        <MetricCard
          title="In Transit"
          value={shippedOrders}
          subtitle="Out for delivery"
          icon={<Truck className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="purple"
        />
      </div>

      {/* 3. REVENUE TREND BAR CHART + PAYMENT BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* 7-Day Revenue Velocity Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  Revenue Velocity (Last 7 Days)
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">Daily gross sales volume and order cadence</p>
            </div>
            <span className="text-xs font-extrabold text-neutral-900 px-3 py-1 bg-neutral-100 rounded-full">
              Peak: {formatPrice(Math.max(...dailyTrends.map((t) => t.revenue), 0))}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-neutral-100 pb-2">
              {dailyTrends.map((t, idx) => {
                const heightPct = Math.round((t.revenue / maxDayRevenue) * 100);
                const isPositive = t.revenue > 0;
                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-neutral-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg shadow-md whitespace-nowrap z-20">
                      {formatPrice(t.revenue)} ({t.count} orders)
                    </div>

                    <div className="w-full max-w-[36px] bg-neutral-100 rounded-xl h-full flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-lg transition-all duration-700 ${
                          isPositive
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300'
                            : 'bg-neutral-200'
                        }`}
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 mt-2 text-center truncate w-full">
                      {t.day.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
            <span>Aggregated across confirmed transactions</span>
            <button
              onClick={() => onChangeView('payments')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Live Gateway Transactions &rarr;
            </button>
          </div>
        </div>

        {/* Payment Methods & Conversion Split */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                Payment Channel Split
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">Prepaid Gateway vs Cash on Delivery</p>

            <div className="space-y-3.5 mt-4">
              {/* Prepaid Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span className="font-extrabold text-emerald-950">Prepaid (Razorpay Gateway)</span>
                  </div>
                  <span className="font-extrabold text-emerald-800">
                    {totalOrders > 0 ? Math.round((prepaidOrders / totalOrders) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-[11px] text-emerald-800 font-medium">{prepaidOrders} orders completed</span>
                  <span className="text-sm font-extrabold text-emerald-900">{formatPrice(prepaidRevenue)}</span>
                </div>
                <div className="h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${totalOrders > 0 ? (prepaidOrders / totalOrders) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* COD Card */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-neutral-700" />
                    <span className="font-extrabold text-neutral-900">Cash on Delivery (COD)</span>
                  </div>
                  <span className="font-extrabold text-neutral-800">
                    {totalOrders > 0 ? Math.round((codOrders / totalOrders) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-[11px] text-neutral-500 font-medium">{codOrders} orders created</span>
                  <span className="text-sm font-extrabold text-neutral-900">{formatPrice(codRevenue)}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-700 rounded-full"
                    style={{ width: `${totalOrders > 0 ? (codOrders / totalOrders) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick summary stat */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Average Order Value:</span>
            <span className="font-extrabold text-neutral-900 font-mono text-sm">{formatPrice(avgOrderValue)}</span>
          </div>
        </div>
      </div>

      {/* 4. TOP PRODUCTS & GEOGRAPHIC INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Top 5 Products */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
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
              className="text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              Inventory &rarr;
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No product sales recorded for this timeframe yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100/70 transition border border-neutral-200/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                        i === 0
                          ? 'bg-amber-100 text-amber-900'
                          : i === 1
                          ? 'bg-neutral-200 text-neutral-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">{p.title}</div>
                      <div className="text-[11px] text-neutral-500">{p.count} units sold</div>
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-neutral-900 font-mono shrink-0 ml-2">
                    {formatPrice(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 States */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                  Top Customer States
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">Geographic order distribution</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-neutral-700 px-2.5 py-0.5 bg-neutral-100 rounded-full">
              {topStates.length} Regions
            </span>
          </div>

          {topStates.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No regional data available yet.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {topStates.map(([stateName, count], idx) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-800">{stateName}</span>
                      <span className="text-neutral-900 font-bold">
                        {count} orders ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. ORDER FULFILLMENT PIPELINE + QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Fulfillment Pipeline */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
                Order Fulfillment Pipeline
              </h2>
              <p className="text-[11px] text-neutral-400">Live order lifecycle breakdown</p>
            </div>
            <span className="text-xs text-neutral-900 font-extrabold px-3 py-1 bg-neutral-100 rounded-full">
              {totalOrders} Orders
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              {
                label: 'Confirmed (New / Awaiting Review)',
                count: filteredOrders.filter((o) => o.status === 'Confirmed').length,
                color: 'bg-blue-500',
              },
              {
                label: 'Processing (Packed in Eco Box)',
                count: filteredOrders.filter((o) => o.status === 'Processing').length,
                color: 'bg-amber-500',
              },
              {
                label: 'Shipped (Handed to Courier Partner)',
                count: filteredOrders.filter((o) => o.status === 'Shipped').length,
                color: 'bg-purple-500',
              },
              {
                label: 'Out for Delivery (Last Mile Delivery)',
                count: filteredOrders.filter((o) => o.status === 'Out for Delivery').length,
                color: 'bg-indigo-500',
              },
              {
                label: 'Delivered (Completed Successfully)',
                count: deliveredOrders,
                color: 'bg-emerald-500',
              },
            ].map((st, i) => {
              const pct = totalOrders > 0 ? Math.round((st.count / totalOrders) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-700">{st.label}</span>
                    <span className="text-neutral-900 font-bold">
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${st.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, st.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Management */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
              Quick Management
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Instant store controls</p>

            <div className="space-y-2 mt-3.5">
              <button
                type="button"
                onClick={() => onChangeView('payments')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60 transition text-xs font-bold text-emerald-950"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Razorpay Live Payments</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => onChangeView('customers')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>Registered Customers</span>
                </div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                  {registeredCustomersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('orders')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Process Store Orders</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={onExportCSV}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-neutral-700" />
                  <span>Export Orders CSV</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Subscribers preview */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between mt-3">
            <div>
              <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                Newsletter Leads
              </div>
              <div className="text-xl font-extrabold text-amber-950 mt-0.5">
                {subscribersCount} Leads
              </div>
            </div>
            <button
              onClick={() => onChangeView('customers')}
              className="text-xs font-bold text-amber-900 hover:underline"
            >
              View List &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 6. RECENT ORDERS TABLE */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 font-heading uppercase tracking-wide">
              Recent Customer Orders
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time incoming customer transactions</p>
          </div>
          <button
            onClick={() => onChangeView('orders')}
            className="text-xs font-bold text-neutral-900 hover:underline"
          >
            See all ({orders.length}) &rarr;
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-xs">
            No orders found for the selected time range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3.5 px-5">Order ID</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Payment</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3.5 px-5 font-bold font-mono text-neutral-900">#{order.id}</td>
                    <td className="py-3.5 px-5 font-bold text-neutral-900">{order.customer_name}</td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-5 font-extrabold text-neutral-900">{formatPrice(order.total)}</td>
                    <td className="py-3.5 px-5 uppercase text-[10px] font-bold text-neutral-500">
                      {order.payment_method || 'COD'}
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500">{formatDate(order.created_at)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order)}
                        className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition"
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
