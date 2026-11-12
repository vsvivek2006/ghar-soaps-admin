'use client';

import React, { useState } from 'react';
import { ContactInquiry, InquiryStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../lib/utils';
import {
  Search,
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  Save,
  ShoppingBag,
} from 'lucide-react';

interface ContactsViewProps {
  inquiries: ContactInquiry[];
  onUpdateInquiry: (id: string, status: InquiryStatus, adminNotes?: string) => Promise<boolean>;
  onDeleteInquiry: (id: string) => Promise<boolean>;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  inquiries,
  onUpdateInquiry,
  onDeleteInquiry,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | InquiryStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingStatuses, setEditingStatuses] = useState<Record<string, InquiryStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = inquiries.filter((inq) => {
    const matchesStatus = statusFilter === 'All' || inq.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inq.id.toLowerCase().includes(q) ||
      inq.name.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      (inq.phone || '').includes(q) ||
      (inq.order_id || '').toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const handleSave = async (inq: ContactInquiry) => {
    setSavingId(inq.id);
    const nextStatus = editingStatuses[inq.id] || inq.status;
    const nextNotes = editingNotes[inq.id] ?? inq.admin_notes ?? '';
    await onUpdateInquiry(inq.id, nextStatus, nextNotes);
    setSavingId(null);
  };

  const statuses: ('All' | InquiryStatus)[] = ['All', 'New', 'In Progress', 'Resolved'];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {statuses.map((st) => {
            const count = st === 'All' ? inquiries.length : inquiries.filter((i) => i.status === st).length;
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition min-h-[38px] flex items-center shrink-0 cursor-pointer ${
                  active
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-600'
                }`}
              >
                <span>{st}</span>
                <span className={`ml-1.5 text-[10px] ${active ? 'opacity-90' : 'text-neutral-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket ID (INQ-...), customer name, email, order ID, or message..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Inquiries List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-neutral-200 text-center space-y-2">
          <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto" />
          <div className="text-sm font-bold text-neutral-800">No Customer Inquiries Found</div>
          <p className="text-xs text-neutral-500">
            Messages sent through the storefront Contact Us page appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((inq) => {
            const currentStatus = editingStatuses[inq.id] || inq.status;
            const currentNotes = editingNotes[inq.id] ?? inq.admin_notes ?? '';

            return (
              <div
                key={inq.id}
                data-testid={`inquiry-card-${inq.id}`}
                className="bg-white rounded-3xl border border-neutral-200/90 p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-extrabold text-xs sm:text-sm text-neutral-900">
                      #{inq.id}
                    </span>
                    <StatusBadge status={inq.status} />
                    {inq.order_id && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#fef7ea] text-[#8a6116] border border-[#ecd9b2] px-2 py-0.5 rounded-lg">
                        <ShoppingBag className="w-3 h-3" />
                        {inq.order_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTime(inq.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete inquiry #${inq.id}?`)) {
                          onDeleteInquiry(inq.id);
                        }
                      }}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Delete inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Customer Contact Strip */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                  <div className="font-bold text-neutral-900">{inq.name}</div>
                  <a
                    href={`mailto:${inq.email}`}
                    className="inline-flex items-center gap-1 text-[#108474] font-semibold hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {inq.email}
                  </a>
                  {inq.phone && (
                    <a
                      href={`tel:+91${inq.phone}`}
                      className="inline-flex items-center gap-1 text-neutral-700 font-mono hover:text-black"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      +91 {inq.phone}
                    </a>
                  )}
                </div>

                {/* Message Body */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5 text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap">
                  {inq.message}
                </div>

                {/* Admin Resolution Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1 items-center">
                  <div className="sm:col-span-3">
                    <select
                      value={currentStatus}
                      onChange={(e) =>
                        setEditingStatuses((prev) => ({
                          ...prev,
                          [inq.id]: e.target.value as InquiryStatus,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-black"
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={currentNotes}
                      onChange={(e) =>
                        setEditingNotes((prev) => ({
                          ...prev,
                          [inq.id]: e.target.value,
                        }))
                      }
                      placeholder="Add internal resolution note..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={savingId === inq.id}
                      onClick={() => handleSave(inq)}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                    >
                      {inq.status === 'Resolved' && currentStatus === 'Resolved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savingId === inq.id ? 'Saving...' : 'Update'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

