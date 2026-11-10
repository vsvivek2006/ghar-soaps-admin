import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Order } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return `₹ ${num.toLocaleString('en-IN')}`;
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function exportOrdersToCSV(orders: Order[], filename = 'gharsoaps_orders.csv') {
  if (!orders || orders.length === 0) {
    alert('No orders to export');
    return;
  }

  const headers = [
    'Order ID',
    'Customer Name',
    'Phone',
    'Email',
    'Address',
    'City',
    'State',
    'PIN Code',
    'Payment Method',
    'Status',
    'Subtotal',
    'Discount',
    'Total',
    'Coupon',
    'Carrier',
    'AWB Tracking Number',
    'Items Count',
    'Order Date',
  ];

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = orders.map((order) => [
    escapeCSV(order.id),
    escapeCSV(order.customer_name),
    escapeCSV(order.phone),
    escapeCSV(order.email || ''),
    escapeCSV(order.address),
    escapeCSV(order.city),
    escapeCSV(order.state),
    escapeCSV(order.pincode),
    escapeCSV(order.payment_method),
    escapeCSV(order.status),
    order.subtotal,
    order.discount,
    order.total,
    escapeCSV(order.applied_coupon || ''),
    escapeCSV(order.carrier || ''),
    escapeCSV(order.tracking_number || ''),
    order.order_items?.length || 0,
    escapeCSV(formatDateTime(order.created_at)),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

