import React from 'react';
import { Menu, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';
import { ViewType } from './Sidebar';

interface NavbarProps {
  currentView: ViewType;
  onOpenMobileSidebar: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  ordersCount: number;
}

const VIEW_TITLES: Record<ViewType, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Store Overview',
    subtitle: 'Real-time sales, 100% prepaid orders, and fulfillment pipeline.',
  },
  orders: {
    title: 'Prepaid Orders',
    subtitle: 'Manage incoming orders, update shipping status, and view customer details.',
  },
  payments: {
    title: 'Customer Payments & Recovery',
    subtitle: 'Real-time gateway tracking, success rates, and 1-click checkout recovery.',
  },
  customers: {
    title: 'Customers & Subscribers',
    subtitle: 'Customer contacts, order history, and VIP newsletter leads.',
  },
  contacts: {
    title: 'Customer Inquiries',
    subtitle: 'Messages and support tickets submitted from the Contact Us page.',
  },
  products: {
    title: 'Product Catalog',
    subtitle: 'Browse all active products, pricing, stock, and variant details.',
  },
  settings: {
    title: 'Store Settings',
    subtitle: 'Store profile, 100% prepaid policy, courier preferences, and security.',
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenMobileSidebar,
  onRefresh,
  isRefreshing,
  ordersCount,
}) => {
  const meta = VIEW_TITLES[currentView] || { title: 'Admin', subtitle: '' };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-neutral-200/60 sticky top-0 z-30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger button (< 768px) */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 -ml-1 rounded-xl text-neutral-700 hover:bg-neutral-100 transition touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight font-heading">
            {meta.title}
          </h1>
          <p className="text-xs text-neutral-400 hidden sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* 100% Prepaid Badge */}
        <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Prepaid Store</span>
        </span>

        {/* Global Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-2xs"
          title="Refresh all store orders & customers"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Store'}</span>
        </button>
      </div>
    </header>
  );
};
