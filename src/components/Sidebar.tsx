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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ViewType = 'dashboard' | 'orders' | 'customers' | 'products' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  pendingCount?: number;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  pendingCount = 0,
  isOpen,
  onCloseMobile,
}) => {
  const { logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
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
      label: 'Customers & VIP',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'products' as ViewType,
      label: 'Catalog & Stock',
      icon: <PackageSearch className="w-4 h-4" />,
    },
    {
      id: 'settings' as ViewType,
      label: 'System & Health',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.gharsoaps.shop/cdn/shop/files/PNG-Logo-Gharsoaps.png?v=1745295691"
              alt="Ghar Soaps"
              className="h-8 w-auto"
            />
          </div>
          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border border-emerald-200">
            Admin
          </span>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-2">
            Store Management
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
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
                        ? 'bg-emerald-400 text-neutral-950'
                        : 'bg-emerald-100 text-emerald-800'
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
              External Shortcuts
            </div>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-black transition"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-4 h-4 text-neutral-400" />
                <span>View Live Store</span>
              </div>
            </a>
          </div>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-neutral-100 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200/60">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-neutral-900 truncate">Authenticated Admin</div>
              <div className="text-[10px] text-neutral-400">12h Session Active</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};

