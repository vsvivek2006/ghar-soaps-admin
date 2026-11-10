'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Order, OrderStatus, Subscriber } from './types';
import { exportOrdersToCSV } from './lib/utils';
import { Sidebar, ViewType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OrderDetailModal } from './components/OrderDetailModal';
import { Toast } from './components/Toast';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { SettingsView } from './views/SettingsView';

export const AppContent: React.FC = () => {
  const { isAuthenticated, token, isLoading } = useAuth();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Orders from Admin Next.js Server API (Authenticated)
  const fetchOrders = async () => {
    if (!token) return;
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to load orders', 'error');
      } else if (Array.isArray(data.data)) {
        setOrders(data.data as Order[]);
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      showToast('Network error connecting to database', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Fetch VIP Subscribers from Admin Next.js Server API (Authenticated)
  const fetchSubscribers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/newsletter', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.subscribers)) {
        setSubscribers(data.subscribers as Subscriber[]);
      }
    } catch (err) {
      console.error('Fetch subscribers error:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrders();
      fetchSubscribers();
    }
  }, [isAuthenticated, token]);

  // 3. Update Order Status & Courier in Next.js Server API (Authenticated)
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    note?: string
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: orderId,
          status: newStatus,
          carrier,
          trackingNumber,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update order status', 'error');
        return false;
      }

      showToast(`Order #${orderId} updated to ${newStatus}!`);
      await fetchOrders();

      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                carrier: carrier || prev.carrier,
                tracking_number: trackingNumber || prev.tracking_number,
              }
            : null
        );
      }

      return true;
    } catch (err: any) {
      showToast('Error updating order record', 'error');
      return false;
    }
  };

  // 4. Delete Order via Next.js Server API (Authenticated)
  const handleDeleteOrder = async (orderId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to delete order', 'error');
        return false;
      }

      showToast(`Order #${orderId} deleted permanently.`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (activeOrder?.id === orderId) {
        setActiveOrder(null);
      }
      return true;
    } catch (err: any) {
      showToast('Network error deleting order', 'error');
      return false;
    }
  };

  // 5. Export to CSV
  const handleExportCSV = () => {
    exportOrdersToCSV(orders);
    showToast('Orders exported to CSV successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
            Loading Admin Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const pendingCount = orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-row font-sans">
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />

      {/* 1. DESKTOP SIDEBAR: Standard flex child in document flow - CAN NEVER OVERLAP! */}
      <div className="hidden lg:flex w-64 shrink-0 flex-col min-h-screen border-r border-neutral-200 bg-white">
        <Sidebar
          currentView={currentView}
          onChangeView={setCurrentView}
          pendingCount={pendingCount}
        />
      </div>

      {/* 2. MOBILE DRAWER: Modal overlay on small screens */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white z-10 flex flex-col justify-between h-full shadow-2xl animate-fade-in">
            <Sidebar
              currentView={currentView}
              onChangeView={setCurrentView}
              pendingCount={pendingCount}
              isOpen={true}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER: Natural flex-1 sibling */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentView={currentView}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onRefresh={fetchOrders}
          isRefreshing={isRefreshing}
          ordersCount={orders.length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              orders={orders}
              subscribersCount={subscribers.length}
              onOpenOrder={setActiveOrder}
              onChangeView={setCurrentView}
              onExportCSV={handleExportCSV}
            />
          )}

          {currentView === 'orders' && (
            <OrdersView
              orders={orders}
              onOpenOrder={setActiveOrder}
              onDeleteOrder={handleDeleteOrder}
              onExportCSV={handleExportCSV}
            />
          )}

          {currentView === 'customers' && (
            <CustomersView
              orders={orders}
              subscribers={subscribers}
            />
          )}

          {currentView === 'products' && <ProductsView />}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
