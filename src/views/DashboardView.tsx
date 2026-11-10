'use client';

import React from 'react';
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
} from 'lucide-react';
import { ViewType } from '../components/Sidebar';

interface DashboardViewProps {
  orders: Order[];
  subscribersCount: number;
  onOpenOrder: (order: Order) => void;
  onChangeView: (view: ViewType) => void;
  onExportCSV: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  subscribersCount,
  onOpenOrder,
  onChangeView,
  onExportCSV,
}) => {
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length;
  const shippedOrders = orders.filter((o) => ['Shipped', 'Out for Delivery'].includes(o.status)).length;
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Metrics Row (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Sales"
          value={formatPrice(totalRevenue)}
          subtitle="Gross sales received"
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
          title="To Be Dispatched"
          value={pendingOrders}
          subtitle="Waiting for packing"
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="amber"
        />
        <MetricCard
          title="In Transit"
          value={shippedOrders}
          subtitle="Out via courier"
          icon={<Truck className="w-4 h-4 sm:w-5 sm:h-5" />}
          accentColor="purple"
        />
      </div>

      {/* Fulfillment Funnel & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Fulfillment Pipeline */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
              Order Fulfillment Pipeline
            </h2>
            <span className="text-xs text-neutral-400 font-semibold">{totalOrders} Total Orders</span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'Confirmed (New)', count: orders.filter((o) => o.status === 'Confirmed').length, color: 'bg-blue-500' },
              { label: 'Processing (Packing)', count: orders.filter((o) => o.status === 'Processing').length, color: 'bg-amber-500' },
              { label: 'Shipped (In Transit)', count: orders.filter((o) => o.status === 'Shipped').length, color: 'bg-purple-500' },
              { label: 'Out for Delivery', count: orders.filter((o) => o.status === 'Out for Delivery').length, color: 'bg-indigo-500' },
              { label: 'Delivered', count: deliveredOrders, color: 'bg-emerald-500' },
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
                      style={{ width: `${Math.max(pct, st.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions & VIP Leads */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wider font-heading">
              Store Actions
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Quick management links</p>

            <div className="space-y-2 mt-3.5">
              <button
                onClick={() => onChangeView('orders')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900 touch-manipulation min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-neutral-700" />
                  <span>View All Orders</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                onClick={onExportCSV}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900 touch-manipulation min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-700" />
                  <span>Export Orders CSV</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>

              <a
                href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://gharsoap.shop'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 transition text-xs font-bold text-neutral-900 touch-manipulation min-h-[44px]"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Visit Storefront</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </a>
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

      {/* Recent Orders Container */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 font-heading uppercase tracking-wide">
              Recent Orders
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Most recent incoming orders</p>
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
            No orders found yet. New store orders will appear here automatically.
          </div>
        ) : (
          <>
            {/* Mobile Card List (Hidden on desktop) */}
            <div className="block md:hidden divide-y divide-neutral-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-neutral-900 text-xs">#{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-neutral-900">{order.customer_name}</div>
                      <div className="text-[11px] text-neutral-400">{order.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-neutral-900">{formatPrice(order.total)}</div>
                      <div className="text-[10px] text-neutral-400">{formatDate(order.created_at)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenOrder(order)}
                    className="w-full bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[40px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View & Manage</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-5">Order ID</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5">City</th>
                    <th className="py-3 px-5">Items</th>
                    <th className="py-3 px-5">Total</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-neutral-900 whitespace-nowrap">
                        #{order.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900">{order.customer_name}</div>
                        <div className="text-[11px] text-neutral-400">{order.phone}</div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div>{order.city}</div>
                        <div className="text-[10px] text-neutral-400">{order.state}</div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">
                        {order.order_items?.length || 0} item(s)
                      </td>
                      <td className="py-3.5 px-5 font-extrabold text-neutral-900 whitespace-nowrap">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-5 text-neutral-400 whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenOrder(order)}
                          className="bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 px-3 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
