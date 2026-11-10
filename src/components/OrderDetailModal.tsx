'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatPrice, formatDateTime } from '../lib/utils';
import {
  X,
  Package,
  Truck,
  Phone,
  MessageCircle,
  CreditCard,
  Trash2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    note?: string
  ) => Promise<boolean>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onDeleteOrder,
}) => {
  if (!order) return null;

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [carrier, setCarrier] = useState(order.carrier || 'BlueDart Express Air');
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onUpdateStatus(order.id, status, carrier, trackingNumber, note);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete order #${order.id}? This action cannot be undone.`)) {
      setIsDeleting(true);
      await onDeleteOrder(order.id);
      setIsDeleting(false);
      onClose();
    }
  };

  const cleanPhone = order.phone.replace(/\D/g, '').slice(-10);
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hello ${order.customer_name}, this is Ghar Soaps regarding your order #${order.id}. Current status: ${order.status}. Courier: ${carrier} (Tracking: ${trackingNumber || 'In Packing'}).`
  )}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 font-heading">
                  Order #{order.id}
                </h3>
                <StatusBadge status={order.status} />
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Placed on {formatDateTime(order.created_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete Order"
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 transition touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Customer & Address Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-200">
            {/* Customer Details */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                Customer & Contact
              </div>
              <div>
                <div className="font-bold text-neutral-900 text-sm">{order.customer_name}</div>
                {order.email && <div className="text-neutral-500 mt-0.5 text-xs">{order.email}</div>}
              </div>

              {/* Call & WhatsApp actions */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`tel:+91${cleanPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-300 font-bold text-neutral-700 hover:border-black transition touch-manipulation min-h-[38px]"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call</span>
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition touch-manipulation min-h-[38px]"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Shipping Destination */}
            <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-neutral-200 pt-3 sm:pt-0 sm:pl-4">
              <div className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                Delivery Address
              </div>
              <div className="text-neutral-700 leading-relaxed font-medium">
                {order.address}
                <br />
                {order.city}, {order.state} - <strong className="text-black">{order.pincode}</strong>
              </div>
              <div className="text-[11px] text-neutral-600 pt-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  Payment: <strong className="uppercase text-black font-bold">{order.payment_method}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Ordered Items ({order.order_items?.length || 0})
              </span>
              <span className="text-xs font-extrabold text-neutral-900">
                Total: {formatPrice(order.total)}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-hidden bg-white">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => (
                  <div key={idx} className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-11 h-11 rounded-xl object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 truncate text-xs">{item.title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {item.variant ? `${item.variant} • ` : ''}Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-neutral-900">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {formatPrice(item.price)} each
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-neutral-400">No items recorded</div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 space-y-1.5">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount ({order.applied_coupon || 'Coupon'}):</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-neutral-950 pt-1.5 border-t border-neutral-200">
                <span>Total Amount:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Update Order & Courier Tracking Form */}
          <form onSubmit={handleSave} className="border-t border-neutral-200 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-wide">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span>Update Shipping & Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Change Status:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white font-bold text-neutral-900 focus:outline-none focus:border-black text-xs"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing (Packing)</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Courier Partner:
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. BlueDart Express / Delhivery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-medium text-neutral-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Tracking Number (AWB):
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. AWB849201948"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-medium text-neutral-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Status Note (Optional):
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Package dispatched from Mumbai hub."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-medium text-neutral-900 focus:outline-none focus:border-black text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm touch-manipulation min-h-[44px]"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save & Update Order</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tracking History Milestones */}
          {order.order_tracking_events && order.order_tracking_events.length > 0 && (
            <div className="border-t border-neutral-200 pt-5 space-y-3">
              <div className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                Tracking History
              </div>
              <div className="space-y-3 pl-1">
                {order.order_tracking_events.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-50" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-900 text-xs">{evt.title}</div>
                      {evt.description && (
                        <div className="text-[11px] text-neutral-600 mt-0.5">{evt.description}</div>
                      )}
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {evt.location} • {formatDateTime(evt.occurred_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
