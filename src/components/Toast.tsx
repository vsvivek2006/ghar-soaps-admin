import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-5 right-5 z-50 animate-bounce flex items-center gap-3 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-neutral-800 text-xs font-semibold">
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-neutral-400 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

