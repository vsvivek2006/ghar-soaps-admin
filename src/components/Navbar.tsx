import React from 'react';
import { Menu, RefreshCw, ExternalLink, Activity } from 'lucide-react';
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
    title: 'Executive Dashboard',
    subtitle: 'Real-time sales, order volume, and fulfillment pipeline.',
  },
  orders: {
    title: 'Order Management',
    subtitle: 'Search, filter, update courier status, and contact customers.',
  },
  customers: {
    title: 'Customers & Leads',
    subtitle: 'Unique customer records and newsletter subscribers.',
  },
  products: {
    title: 'Product Catalog',
    subtitle: 'Browse all products, pricing, and variants.',
  },
  settings: {
    title: 'System & Database Health',
    subtitle: 'Supabase PostgreSQL connection, credentials, and security.',
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
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-sm px-4 sm:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition"
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

      <div className="flex items-center gap-3">
        {/* Supabase Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Supabase Mumbai</span>
        </div>

        {/* Sync Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync ({ordersCount})</span>
        </button>
      </div>
    </header>
  );
};

