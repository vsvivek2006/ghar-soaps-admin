import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatPrice, formatDate } from '../lib/utils';
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Package,
  Phone,
  CheckCircle2,
  AlertCircle,
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
  const [paymentFilter, setPaymentFilter] = useState<string>('All');

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === 'All' || order.status === selectedStatus;
    const matchesPayment =
      paymentFilter === 'All' ||
      (paymentFilter === 'cod' && order.payment_method?.toLowerCase() === 'cod') ||
      (paymentFilter === 'prepaid' && order.payment_method?.toLowerCase() !== 'cod');

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      order.id.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.phone.includes(q) ||
      order.city.toLowerCase().includes(q) ||
      order.pincode.includes(q);

    return matchesStatus && matchesPayment && matchesQuery;
  });

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
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {statuses.map((st) => {
            const count = st === 'All' ? orders.length : orders.filter((o) => o.status === st).length;
            const isSelected = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-sm'
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

        {/* Controls Bar: Search + Payment Filter + Export CSV */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, customer name, phone, city, PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-neutral-300 text-xs font-medium text-neutral-900 focus:outline-none focus:border-black transition"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl border border-neutral-300 text-xs font-bold text-neutral-700 bg-white focus:outline-none focus:border-black"
            >
              <option value="All">All Payment Modes</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="prepaid">Prepaid (UPI / Card)</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-2xl transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-neutral-900 font-heading uppercase tracking-wide">
            Matching Orders ({filteredOrders.length})
          </h3>
          <span className="text-xs text-neutral-400 font-medium">Synced with Supabase</span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Package className="w-10 h-10 text-neutral-300 mx-auto" />
            <div className="text-sm font-bold text-neutral-700">No matching orders found</div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Try changing the search query or status filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </div>
    </div>
  );
};

