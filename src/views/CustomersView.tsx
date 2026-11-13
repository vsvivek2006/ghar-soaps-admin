'use client';

import React, { useMemo, useState } from 'react';
import { Order, Subscriber, RegisteredCustomer } from '../types';
import { formatPrice, formatDate, formatDateTime } from '../lib/utils';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  Users,
  Mail,
  Phone,
  MessageCircle,
  Search,
  UserCheck,
  Calendar,
  Edit2,
  Trash2,
  X,
  Check,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface CustomersViewProps {
  orders: Order[];
  subscribers: Subscriber[];
  registeredCustomers?: RegisteredCustomer[];
  onUpdateCustomer?: (userId: string, data: { full_name: string; phone?: string; email?: string }) => Promise<boolean>;
  onDeleteCustomer?: (userId: string) => Promise<boolean>;
  onRefresh?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  orders,
  subscribers,
  registeredCustomers = [],
  onUpdateCustomer,
  onDeleteCustomer,
  onRefresh,
}) => {
  const [tab, setTab] = useState<'registered' | 'buyers' | 'subscribers'>('registered');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);

  // Editing state
  const [editingCustomer, setEditingCustomer] = useState<RegisteredCustomer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Selected customer for viewing orders
  const [viewingOrdersCustomer, setViewingOrdersCustomer] = useState<RegisteredCustomer | null>(null);

  // Memoize aggregated buyers map from orders
  const orderBuyers = useMemo(() => {
    const customerMap = new Map<
      string,
      {
        name: string;
        phone: string;
        email?: string;
        city: string;
        state: string;
        totalSpent: number;
        orderCount: number;
        lastOrderDate: string;
      }
    >();

    orders.forEach((o) => {
      const key = o.phone.trim();
      const isPaid = (o.payment_status || '').toLowerCase() === 'paid' && o.status !== 'Cancelled';
      const orderAmount = isPaid ? (Number(o.total) || 0) : 0;
      const orderIncrement = isPaid ? 1 : 0;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: o.customer_name,
          phone: o.phone,
          email: o.email,
          city: o.city,
          state: o.state,
          totalSpent: orderAmount,
          orderCount: orderIncrement,
          lastOrderDate: o.created_at,
        });
      } else {
        const existing = customerMap.get(key)!;
        existing.totalSpent += orderAmount;
        existing.orderCount += orderIncrement;
        if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = o.created_at;
        }
      }
    });

    return Array.from(customerMap.values());
  }, [orders]);

  const handleOpenEdit = (c: RegisteredCustomer) => {
    setEditingCustomer(c);
    setEditName(c.full_name || '');
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !onUpdateCustomer) return;
    setIsSaving(true);
    const success = await onUpdateCustomer(editingCustomer.id, {
      full_name: editName,
      phone: editPhone,
      email: editEmail,
    });
    setIsSaving(false);
    if (success) {
      setEditingCustomer(null);
    }
  };

  const handleDelete = async (c: RegisteredCustomer) => {
    if (!onDeleteCustomer) return;
    if (confirm(`Are you sure you want to remove customer account for ${c.full_name}?`)) {
      await onDeleteCustomer(c.id);
    }
  };

  // Filter lists by debounced search query
  const { filteredRegistered, filteredBuyers, filteredSubscribers } = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return {
      filteredRegistered: registeredCustomers.filter(
        (c) =>
          !q ||
          c.full_name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      ),
      filteredBuyers: orderBuyers.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          c.city.toLowerCase().includes(q)
      ),
      filteredSubscribers: subscribers.filter(
        (s) =>
          !q ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q))
      ),
    };
  }, [registeredCustomers, orderBuyers, subscribers, debouncedSearch]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>Registered Users</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1">
            {registeredCustomers.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Live in Supabase Auth</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>Store Buyers</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-900 mt-1">
            {orderBuyers.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Purchased on store</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>VIP Subscribers</span>
            <Mail className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">
            {subscribers.length}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">Newsletter Club</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>Repeat Buyers</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1">
            {orderBuyers.length > 0
              ? `${Math.round(
                  (orderBuyers.filter((c) => c.orderCount > 1).length / orderBuyers.length) * 100
                )}%`
              : '0%'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">2+ Orders placed</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setTab('registered')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
                tab === 'registered'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registered Accounts ({registeredCustomers.length})</span>
            </button>
            <button
              onClick={() => setTab('buyers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
                tab === 'buyers'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              <span>Order Buyers ({orderBuyers.length})</span>
            </button>
            <button
              onClick={() => setTab('subscribers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
                tab === 'subscribers'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Newsletter ({subscribers.length})</span>
            </button>
          </div>

          <div className="relative min-w-full sm:min-w-[280px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {/* Tab 1: Registered Accounts from Supabase Auth */}
        {tab === 'registered' && (
          <div>
            {filteredRegistered.length === 0 ? (
              <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">
                No registered user accounts match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-600">
                  <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3.5 px-5">Customer Profile</th>
                      <th className="py-3.5 px-5">Registered Identifier</th>
                      <th className="py-3.5 px-5">Joined On</th>
                      <th className="py-3.5 px-5">Orders</th>
                      <th className="py-3.5 px-5">Total Spent</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredRegistered.map((c) => {
                      const cleanPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
                      return (
                        <tr key={c.id} className="hover:bg-neutral-50/70 transition">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                              <span>{c.full_name}</span>
                              {c.role === 'admin' && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono truncate max-w-xs">
                              ID: {c.id.slice(0, 12)}...
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-neutral-800">
                                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{c.email}</span>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-neutral-800 mt-0.5 font-mono">
                                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                                <span>+91 {cleanPhone}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap text-neutral-600">
                            {formatDate(c.created_at)}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingOrdersCustomer(c)}
                              className="font-bold text-[#108474] hover:underline"
                            >
                              {c.orderCount} order(s)
                            </button>
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap font-extrabold text-neutral-900">
                            {formatPrice(c.totalSpent)}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {c.email_confirmed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(
                                    c.full_name
                                  )}%2C%20greetings%20from%20Ghar%20Soaps!`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(c)}
                                className="p-2 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                                title="Edit Customer Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(c)}
                                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                title="Delete Customer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* Tab 2: Order Buyers */}
        {tab === 'buyers' && (
          <div>
            {filteredBuyers.length === 0 ? (
              <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">No buyer records found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-600">
                  <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3.5 px-5">Customer</th>
                      <th className="py-3.5 px-5">Contact</th>
                      <th className="py-3.5 px-5">Location</th>
                      <th className="py-3.5 px-5">Orders</th>
                      <th className="py-3.5 px-5">Total Spent</th>
                      <th className="py-3.5 px-5">Last Order</th>
                      <th className="py-3.5 px-5 text-right">Connect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBuyers.map((c, i) => {
                      const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
                      return (
                        <tr key={i} className="hover:bg-neutral-50/70 transition">
                          <td className="py-3.5 px-5 font-bold text-neutral-900">{c.name}</td>
                          <td className="py-3.5 px-5">
                            <div className="font-mono text-neutral-800">+91 {cleanPhone}</div>
                            {c.email && <div className="text-[11px] text-neutral-400">{c.email}</div>}
                          </td>
                          <td className="py-3.5 px-5">
                            {c.city}, {c.state}
                          </td>
                          <td className="py-3.5 px-5 font-bold text-neutral-900">{c.orderCount} order(s)</td>
                          <td className="py-3.5 px-5 font-extrabold text-neutral-900">{formatPrice(c.totalSpent)}</td>
                          <td className="py-3.5 px-5 text-neutral-500">{formatDate(c.lastOrderDate)}</td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`tel:+91${cleanPhone}`}
                                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition"
                                title="Call"
                              >
                                <Phone className="w-3.5 h-3.5 text-blue-600" />
                              </a>
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(c.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
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
        )}

        {/* Tab 3: Newsletter Subscribers */}
        {tab === 'subscribers' && (
          <div>
            {filteredSubscribers.length === 0 ? (
              <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">No subscribers found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-600">
                  <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3.5 px-5">Email Address / Phone</th>
                      <th className="py-3.5 px-5">Subscribed Date</th>
                      <th className="py-3.5 px-5">Channel</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredSubscribers.map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-3.5 px-5 font-bold text-neutral-900">{s.email || s.phone}</td>
                        <td className="py-3.5 px-5 text-neutral-500">{formatDate(s.created_at)}</td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                            VIP Club
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <a
                            href={`mailto:${s.email}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:text-black p-1.5 rounded-lg hover:bg-neutral-100 transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#fef7ea]">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 font-heading">
                  Edit Customer Profile
                </h3>
                <p className="text-[11px] text-neutral-500">Update registered customer information</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Mobile Number (10 Digits)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#108474] hover:bg-[#0c6b5e] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Orders History Modal */}
      {viewingOrdersCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 font-heading">
                  Order History for {viewingOrdersCustomer.full_name}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {viewingOrdersCustomer.orderCount} order(s) • Total spend: {formatPrice(viewingOrdersCustomer.totalSpent)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrdersCustomer(null)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {viewingOrdersCustomer.orders && viewingOrdersCustomer.orders.length > 0 ? (
                viewingOrdersCustomer.orders.map((ord) => (
                  <div key={ord.id} className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-neutral-900">Order #{ord.id}</div>
                      <div className="text-[11px] text-neutral-500">{formatDate(ord.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-xs text-neutral-900">{formatPrice(ord.total)}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No orders placed yet by this customer.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 text-right bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setViewingOrdersCustomer(null)}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
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
