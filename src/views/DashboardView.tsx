'use client';

import React, { useMemo } from 'react';
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  subscribersCount,
  registeredCustomersCount = 0,
  onOpenOrder,
  onChangeView,
  onExportCSV,
}) => {
  const {
    totalRevenue,
    totalOrders,
    pendingOrders,
    shippedOrders,
    deliveredOrders,
    avgOrderValue,
    codOrders,
    prepaidOrders,
    recentOrders,
  } = useMemo(() => {
    let rev = 0;
    let pending = 0;
    let shipped = 0;
    let delivered = 0;
    let cod = 0;
    for (const o of orders) {
      rev += Number(o.total) || 0;
      if (o.status === 'Confirmed' || o.status === 'Processing') pending++;
      else if (o.status === 'Shipped' || o.status === 'Out for Delivery') shipped++;
      else if (o.status === 'Delivered') delivered++;
      if ((o.payment_method || '').toLowerCase().includes('cod')) cod++;
    }
    const totalCount = orders.length;
    return {
      totalRevenue: rev,
      totalOrders: totalCount,
      pendingOrders: pending,
      shippedOrders: shipped,
      deliveredOrders: delivered,
      avgOrderValue: totalCount > 0 ? Math.round(rev / totalCount) : 0,
      codOrders: cod,
      prepaidOrders: totalCount - cod,
      recentOrders: orders.slice(0, 6),
    };
  }, [orders]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Metrics Row (Optimized 5-column / 2-column responsive layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          title="Total Sales"
          value={formatPrice(totalRevenue)}
          subtitle="Gross sales generated"
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
          title="Registered Users"
          value={registeredCustomersCount}
          subtitle="Live Supabase accounts"
          icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="purple"
        />
        <MetricCard
          title="To Be Dispatched"
          value={pendingOrders}
          subtitle="Awaiting packing"
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

      {/* Fulfillment Funnel & Quick Actions */}
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
                count: orders.filter((o) => o.status === 'Confirmed').length,
                color: 'bg-blue-500',
              },
              {
                label: 'Processing (Packed in Eco Box)',
                count: orders.filter((o) => o.status === 'Processing').length,
                color: 'bg-amber-500',
              },
              {
                label: 'Shipped (Handed to Courier Partner)',
                count: orders.filter((o) => o.status === 'Shipped').length,
                color: 'bg-purple-500',
              },
              {
                label: 'Out for Delivery (Last Mile Delivery)',
                count: orders.filter((o) => o.status === 'Out for Delivery').length,
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

          {/* Payment Split Banner */}
          <div className="pt-3 border-t border-neutral-100 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Prepaid Orders</span>
              <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                {prepaidOrders} ({totalOrders > 0 ? Math.round((prepaidOrders / totalOrders) * 100) : 0}%)
              </div>
            </div>
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Cash on Delivery</span>
              <div className="text-base font-extrabold text-neutral-800 mt-0.5">
                {codOrders} ({totalOrders > 0 ? Math.round((codOrders / totalOrders) * 100) : 0}%)
              </div>
            </div>
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
              Quick Management
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Instant store controls</p>

            <div className="space-y-2 mt-3.5">
              <button
                type="button"
                onClick={() => onChangeView('customers')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Track Registered Users</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {registeredCustomersCount} Users
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('products')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900"
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>Edit Products & Stock</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
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
                Newsletter Subscribers
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

      {/* Recent Orders Table */}
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
            No orders placed yet. Orders will appear here in real-time as customers checkout.
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
