import React from 'react';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md';
}

const CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  Confirmed: {
    label: 'Confirmed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
  Processing: {
    label: 'Processing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  Shipped: {
    label: 'Shipped',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    border: 'border-purple-200',
  },
  'Out for Delivery': {
    label: 'Out for Delivery',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200',
  },
  Delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  Cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const current = CONFIG[status] || {
    label: status,
    bg: 'bg-neutral-50',
    text: 'text-neutral-700',
    dot: 'bg-neutral-400',
    border: 'border-neutral-200',
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${current.bg} ${current.text} ${current.border} ${
        isSmall ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};

