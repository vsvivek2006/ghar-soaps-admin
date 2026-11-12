'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Order, OrderStatus, Subscriber, RegisteredCustomer, ContactInquiry, InquiryStatus } from './types';
import { exportOrdersToCSV } from './lib/utils';
import { Sidebar, ViewType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OrderDetailModal } from './components/OrderDetailModal';
import { Toast } from './components/Toast';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { PaymentsView } from './views/PaymentsView';
import { CustomersView } from './views/CustomersView';
import { ContactsView } from './views/ContactsView';
import { ProductsView } from './views/ProductsView';
import { SettingsView } from './views/SettingsView';

export const AppContent: React.FC = () => {
  const { isAuthenticated, token, isLoading } = useAuth();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<RegisteredCustomer[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // 1. Fetch Orders from Admin Next.js Server API (Authenticated)
  const fetchOrders = useCallback(async () => {
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
  }, [token, showToast]);

  // 2. Fetch Registered Customers from Supabase Auth & Analytics
  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setRegisteredCustomers(data.customers as RegisteredCustomer[]);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  }, [token]);

  // 3. Fetch VIP Subscribers from Admin Next.js Server API (Authenticated)
  const fetchSubscribers = useCallback(async () => {
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
  }, [token]);

  // 3b. Fetch Contact Form Inquiries from Admin Next.js Server API (Authenticated)
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInquiries(data.data as ContactInquiry[]);
      }
    } catch (err) {
      console.error('Fetch contacts error:', err);
    }
  }, [token]);

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOrders(), fetchCustomers(), fetchSubscribers(), fetchContacts()]);
    setIsRefreshing(false);
  }, [fetchOrders, fetchCustomers, fetchSubscribers, fetchContacts]);

  useEffect(() => {
    if (isAuthenticated && token) {
      refreshAllData();
    }
  }, [isAuthenticated, token, refreshAllData]);

  // 4. Update Order Status, Courier, and Customer Details in Next.js Server API
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    carrier?: string,
    trackingNumber?: string,
    note?: string,
    customerDetails?: {
      customer_name?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    }
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      const payload: any = {
        id: orderId,
        status: newStatus,
        carrier,
        trackingNumber,
        note,
      };

      if (customerDetails) {
        Object.assign(payload, customerDetails);
      }

      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update order status', 'error');
        return false;
      }

      showToast(`Order #${orderId} updated successfully!`);
      await fetchOrders();

      if (activeOrder && activeOrder.id === orderId) {
        setActiveOrder((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                carrier: carrier || prev.carrier,
                tracking_number: trackingNumber || prev.tracking_number,
                ...(customerDetails || {}),
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

  // 5. Update Customer Details via Server API
  const handleUpdateCustomer = async (
    userId: string,
    customerData: { full_name: string; phone?: string; email?: string }
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...customerData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update customer', 'error');
        return false;
      }

      showToast('Customer profile updated successfully!');
      await fetchCustomers();
      return true;
    } catch {
      showToast('Error updating customer profile', 'error');
      return false;
    }
  };

  // 6. Delete Customer via Server API
  const handleDeleteCustomer = async (userId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/customers?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to delete customer', 'error');
        return false;
      }

      showToast('Customer account removed.');
      await fetchCustomers();
      return true;
    } catch {
      showToast('Error deleting customer', 'error');
      return false;
    }
  };

  // 7. Delete Order via Next.js Server API
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
      await fetchOrders();
      return true;
    } catch (err: any) {
      showToast('Error deleting order', 'error');
      return false;
    }
  };

  // 7b. Update & Delete Contact Inquiries via Next.js Server API
  const handleUpdateInquiry = async (
    id: string,
    status: InquiryStatus,
    adminNotes?: string
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status, admin_notes: adminNotes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to update inquiry', 'error');
        return false;
      }

      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data.inquiry } : item))
      );
      showToast(`Inquiry #${id} marked as ${status}.`);
      return true;
    } catch {
      showToast('Error updating inquiry', 'error');
      return false;
    }
  };

  const handleDeleteInquiry = async (id: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to delete inquiry', 'error');
        return false;
      }

      setInquiries((prev) => prev.filter((item) => item.id !== id));
      showToast(`Inquiry #${id} deleted.`);
      return true;
    } catch {
      showToast('Error deleting inquiry', 'error');
      return false;
    }
  };

  // 8. CSV Export for Orders
  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast('No orders available to export', 'error');
      return;
    }
    exportOrdersToCSV(orders);
    showToast(`Exported ${orders.length} orders to CSV successfully!`);
  };

  const pendingCount = useMemo(
    () => orders.filter((o) => ['Confirmed', 'Processing'].includes(o.status)).length,
    [orders]
  );

  const newInquiriesCount = useMemo(
    () => inquiries.filter((i) => i.status === 'New').length,
    [inquiries]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-white text-xs font-semibold uppercase tracking-wider">
            Loading Ghar Soaps Admin...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-row font-sans text-neutral-900 antialiased">
      {/* Toast notifications */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />

      {/* 1. DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-64 shrink-0 flex-col sticky top-0 h-screen border-r border-neutral-200 bg-white z-20">
        <Sidebar
          currentView={currentView}
          onChangeView={setCurrentView}
          pendingCount={pendingCount}
          newInquiriesCount={newInquiriesCount}
        />
      </div>

      {/* 2. MOBILE DRAWER */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white z-10 flex flex-col justify-between h-full shadow-2xl animate-fade-in">
            <Sidebar
              currentView={currentView}
              onChangeView={setCurrentView}
              pendingCount={pendingCount}
              newInquiriesCount={newInquiriesCount}
              isOpen={true}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentView={currentView}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing}
          ordersCount={orders.length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              orders={orders}
              subscribersCount={subscribers.length}
              registeredCustomersCount={registeredCustomers.length}
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

          {currentView === 'payments' && (
            <PaymentsView token={token} onOpenOrder={setActiveOrder} />
          )}

          {currentView === 'customers' && (
            <CustomersView
              orders={orders}
              subscribers={subscribers}
              registeredCustomers={registeredCustomers}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onRefresh={fetchCustomers}
            />
          )}

          {currentView === 'contacts' && (
            <ContactsView
              inquiries={inquiries}
              onUpdateInquiry={handleUpdateInquiry}
              onDeleteInquiry={handleDeleteInquiry}
            />
          )}

          {currentView === 'products' && <ProductsView token={token} />}

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
