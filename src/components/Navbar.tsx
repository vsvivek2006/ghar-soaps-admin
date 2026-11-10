import React from 'react';
import { Menu, RefreshCw, CheckCircle } from 'lucide-react';
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
    subtitle: 'Real-time sales, order volume, and fulfillment status.',
  },
  orders: {
    title: 'Orders',
    subtitle: 'Manage incoming orders, update shipping status, and view customer details.',
  },
  customers: {
    title: 'Customers & Subscribers',
    subtitle: 'Customer contacts, order history, and VIP newsletter leads.',
  },
  products: {
    title: 'Product Catalog',
    subtitle: 'Browse all active products, pricing, and variant details.',
  },
  settings: {
    title: 'Store Settings',
    subtitle: 'Store profile, courier preferences, and admin account security.',
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
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-1 rounded-xl text-neutral-700 hover:bg-neutral-100 transition touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-neutral-900 tracking-tight font-heading">
            {meta.title}
          </h1>
          <p className="hidden sm:block text-xs text-neutral-400 font-medium">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Online Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Store</span>
        </div>

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl transition shadow-xs touch-manipulation min-h-[40px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
          <span>({ordersCount})</span>
        </button>
      </div>
    </header>
  );
};
