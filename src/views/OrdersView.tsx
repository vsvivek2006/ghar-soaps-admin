'use client';

import React, { useMemo, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatPrice, formatDate } from '../lib/utils';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  Search,
  Download,
  Eye,
  Trash2,
  Package,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onOpenOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
  onExportCSV: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onOpenOrder,
  onDeleteOrder,
  onExportCSV,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return orders.filter((order) => {
      const matchesStatus = selectedStatus === 'All' || order.status === selectedStatus;
      const matchesPayment =
        paymentFilter === 'All' ||
        (paymentFilter === 'cod' && order.payment_method?.toLowerCase() === 'cod') ||
        (paymentFilter === 'prepaid' && order.payment_method?.toLowerCase() !== 'cod');

      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer_name.toLowerCase().includes(q) ||
        order.phone.includes(q) ||
        order.city.toLowerCase().includes(q) ||
        order.pincode.includes(q);

      return matchesStatus && matchesPayment && matchesQuery;
    });
  }, [orders, selectedStatus, paymentFilter, debouncedSearch]);

  const statuses: (OrderStatus | 'All')[] = [
    'All',
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3.5">
        {/* Horizontally Scrollable Status Pills (Finger-friendly for mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
          {statuses.map((st) => {
            const count = statusCounts[st] || 0;
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition touch-manipulation min-h-[38px] flex items-center shrink-0 ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
                }`}
              >
                <span>{st}</span>
                <span className={`ml-1.5 text-[10px] ${isSelected ? 'opacity-90' : 'text-neutral-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls: Search + Payment Filter + Export CSV */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, customer name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2.5 rounded-2xl border border-neutral-300 text-xs font-bold text-neutral-700 bg-white focus:outline-none focus:border-black"
            >
              <option value="All">All Payments</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="prepaid">Prepaid</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={onExportCSV}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2.5 rounded-2xl transition shrink-0"
              title="Download Orders CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Matching Orders Container */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-wide font-heading">
            Orders ({filteredOrders.length})
          </h2>
          <span className="text-[11px] text-neutral-400 font-medium">Real-time updates</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-3">
            <Package className="w-10 h-10 text-neutral-300 mx-auto" />
            <div className="text-sm font-bold text-neutral-700">No matching orders found</div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Try adjusting your search query or status filter above.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Touch-friendly Card List (Hidden on desktop) */}
            <div className="block md:hidden divide-y divide-neutral-100">
              {filteredOrders.map((order) => {
                const cleanPhone = order.phone.replace(/\D/g, '').slice(-10);
                return (
                  <div key={order.id} className="p-4 space-y-3">
                    {/* Top Row: Order ID + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 text-sm">#{order.id}</span>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Customer Row with Contact Shortcuts */}
                    <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60">
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 text-xs truncate">
                          {order.customer_name}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          +91 {cleanPhone}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:+91${cleanPhone}`}
                          className="p-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:text-black touch-manipulation"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                        </a>
                        <a
                          href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(order.customer_name)}%2C%20regarding%20your%20Ghar%20Soaps%20order%20%23${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 touch-manipulation"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Destination + Details */}
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <div className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{order.city}, {order.state}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-neutral-950 text-sm">
                          {formatPrice(order.total)}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          {order.payment_method?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onOpenOrder(order)}
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[42px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage & Dispatch</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete order #${order.id}?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="p-2.5 rounded-xl border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition touch-manipulation min-h-[42px]"
                        title="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP VIEW: Full Table (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-5">Order ID</th>
                    <th className="py-3.5 px-5">Customer & Phone</th>
                    <th className="py-3.5 px-5">Delivery Location</th>
                    <th className="py-3.5 px-5">Items</th>
                    <th className="py-3.5 px-5">Total</th>
                    <th className="py-3.5 px-5">Payment</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-5 font-bold text-neutral-900 whitespace-nowrap">
                        #{order.id}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-neutral-900">{order.customer_name}</div>
                        <div className="text-[11px] text-neutral-400">{order.phone}</div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div>{order.city}</div>
                        <div className="text-[10px] text-neutral-400">
                          {order.state} ({order.pincode})
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-700">
                        {order.order_items?.length || 0} item(s)
                      </td>
                      <td className="py-3.5 px-5 font-extrabold text-neutral-900 whitespace-nowrap">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {order.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3.5 px-5 text-neutral-400 whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenOrder(order)}
                            className="bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-800 px-3 py-1.5 rounded-xl font-bold text-[11px] transition inline-flex items-center gap-1 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete order #${order.id}?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
