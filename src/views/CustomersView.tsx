'use client';

import React, { useState } from 'react';
import { Order, Subscriber } from '../types';
import { formatPrice, formatDate } from '../lib/utils';
import { Users, Mail, Phone, MessageCircle, Search } from 'lucide-react';

interface CustomersViewProps {
  orders: Order[];
  subscribers: Subscriber[];
}

export const CustomersView: React.FC<CustomersViewProps> = ({ orders, subscribers }) => {
  const [tab, setTab] = useState<'customers' | 'subscribers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique customers from orders by phone
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    email?: string;
    city: string;
    state: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
  }>();

  orders.forEach((o) => {
    const key = o.phone.trim();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: o.customer_name,
        phone: o.phone,
        email: o.email,
        city: o.city,
        state: o.state,
        totalSpent: Number(o.total) || 0,
        orderCount: 1,
        lastOrderDate: o.created_at,
      });
    } else {
      const existing = customerMap.get(key)!;
      existing.totalSpent += Number(o.total) || 0;
      existing.orderCount += 1;
      if (new Date(o.created_at) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = o.created_at;
      }
    }
  });

  const uniqueCustomers = Array.from(customerMap.values());

  const filteredCustomers = uniqueCustomers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q);
  });

  const filteredSubscribers = subscribers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || (s.email && s.email.toLowerCase().includes(q)) || (s.phone && s.phone.includes(q));
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Buyers</div>
          <div className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1">{uniqueCustomers.length}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Purchased on store</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Subscribers</div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{subscribers.length}</div>
          <div className="text-[11px] text-amber-800 mt-0.5">VIP Club members</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Repeat Rate</div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-700 mt-1">
            {uniqueCustomers.length > 0
              ? `${Math.round(
                  (uniqueCustomers.filter((c) => c.orderCount > 1).length / uniqueCustomers.length) * 100
                )}%`
              : '0%'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Customers with 2+ orders</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('customers')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition touch-manipulation min-h-[40px] ${
                tab === 'customers'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
              }`}
            >
              Order Customers ({uniqueCustomers.length})
            </button>
            <button
              onClick={() => setTab('subscribers')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition touch-manipulation min-h-[40px] ${
                tab === 'subscribers'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
              }`}
            >
              Subscribers ({subscribers.length})
            </button>
          </div>

          <div className="relative min-w-full sm:min-w-[260px]">
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

      {/* Content Container */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {tab === 'customers' ? (
          filteredCustomers.length === 0 ? (
            <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">No customer records found</div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block md:hidden divide-y divide-neutral-100">
                {filteredCustomers.map((c, i) => {
                  const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
                  return (
                    <div key={i} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-neutral-900 text-sm">{c.name}</div>
                        <div className="font-extrabold text-neutral-900 text-sm">{formatPrice(c.totalSpent)}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <div>{c.city}, {c.state}</div>
                        <div>{c.orderCount} order(s)</div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-mono text-neutral-700">+91 {cleanPhone}</span>
                        <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-600">
                  <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="py-3.5 px-5">Customer Name</th>
                      <th className="py-3.5 px-5">Phone Number</th>
                      <th className="py-3.5 px-5">City / State</th>
                      <th className="py-3.5 px-5">Orders</th>
                      <th className="py-3.5 px-5">Total Spent</th>
                      <th className="py-3.5 px-5">Last Order</th>
                      <th className="py-3.5 px-5 text-right">Quick Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredCustomers.map((c, i) => {
                      const cleanPhone = c.phone.replace(/\D/g, '').slice(-10);
                      return (
                        <tr key={i} className="hover:bg-neutral-50/70 transition">
                          <td className="py-3.5 px-5 font-bold text-neutral-900 whitespace-nowrap">
                            {c.name}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-neutral-700 whitespace-nowrap">
                            +91 {cleanPhone}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {c.city}, {c.state}
                          </td>
                          <td className="py-3.5 px-5 font-bold text-neutral-900">
                            {c.orderCount} order(s)
                          </td>
                          <td className="py-3.5 px-5 font-extrabold text-neutral-900 whitespace-nowrap">
                            {formatPrice(c.totalSpent)}
                          </td>
                          <td className="py-3.5 px-5 text-neutral-400 whitespace-nowrap">
                            {formatDate(c.lastOrderDate)}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`tel:+91${cleanPhone}`}
                                className="p-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:text-black hover:border-black transition"
                                title="Call Customer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(c.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                title="WhatsApp Customer"
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
            </>
          )
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-12 sm:p-16 text-center text-neutral-400 text-xs">
            No newsletter subscribers yet. Enter an email in the storefront to test!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-3.5 px-5">Subscriber ID</th>
                  <th className="py-3.5 px-5">Email Address</th>
                  <th className="py-3.5 px-5">Phone</th>
                  <th className="py-3.5 px-5">Subscribed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredSubscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3.5 px-5 font-mono text-neutral-400">#{s.id}</td>
                    <td className="py-3.5 px-5 font-bold text-neutral-900">{s.email || '—'}</td>
                    <td className="py-3.5 px-5 text-neutral-600">{s.phone || '—'}</td>
                    <td className="py-3.5 px-5 text-neutral-400">{formatDate(s.created_at)}</td>
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
