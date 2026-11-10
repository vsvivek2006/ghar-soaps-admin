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
  const { isAuthenticated, token } = useAuth();

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

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const pendingCount = orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex font-sans">
      {/* Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        pendingCount={pendingCount}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
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

