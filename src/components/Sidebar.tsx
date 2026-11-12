import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  PackageSearch,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  X,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ViewType = 'dashboard' | 'orders' | 'customers' | 'contacts' | 'products' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  pendingCount?: number;
  newInquiriesCount?: number;
  isOpen?: boolean;
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  pendingCount = 0,
  newInquiriesCount = 0,
  isOpen = false,
  onCloseMobile,
  isMobileDrawer = false,
}) => {
  const { logout, adminEmail } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'orders' as ViewType,
      label: 'Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'customers' as ViewType,
      label: 'Customers',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'contacts' as ViewType,
      label: 'Inquiries',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: newInquiriesCount > 0 ? newInquiriesCount : undefined,
    },
    {
      id: 'products' as ViewType,
      label: 'Catalog',
      icon: <PackageSearch className="w-4 h-4" />,
    },
    {
      id: 'settings' as ViewType,
      label: 'Store Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full h-full bg-white border-r border-neutral-200 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://www.gharsoaps.shop/cdn/shop/files/PNG-Logo-Gharsoaps.png?v=1745295691"
            alt="Ghar Soaps"
            className="h-7 w-auto object-contain"
          />
          <span className="bg-neutral-900 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
            Admin
          </span>
        </div>

        {/* Mobile close button (only in mobile drawer) */}
        {isMobileDrawer && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 transition touch-manipulation"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2">
          Store Navigation
        </div>

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onChangeView(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition touch-manipulation min-h-[44px] ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2">
            External Store
          </div>
          <a
            href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://gharsoap.shop'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-black transition"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-neutral-400" />
              <span>Open Storefront</span>
            </div>
          </a>
        </div>
      </div>

      {/* Footer info & Logout */}
      <div className="p-4 border-t border-neutral-100 space-y-3">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-neutral-50 rounded-2xl border border-neutral-200/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-neutral-900 truncate">
              {adminEmail || 'admin@gharsoap.shop'}
            </div>
            <div className="text-[10px] text-neutral-400">Store Administrator</div>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition touch-manipulation min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
