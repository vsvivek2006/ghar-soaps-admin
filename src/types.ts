export type OrderStatus =
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: string;
  title: string;
  variant?: string;
  price: number;
  quantity: number;
  image?: string;
  created_at?: string;
}

export interface TrackingEvent {
  id: number;
  order_id: string;
  status: string;
  title: string;
  description: string;
  location: string;
  occurred_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  total: number;
  applied_coupon?: string;
  status: OrderStatus;
  tracking_number?: string;
  carrier?: string;
  created_at: string;
  updated_at?: string;
  order_items?: OrderItem[];
  order_tracking_events?: TrackingEvent[];
}

export interface Subscriber {
  id: number;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  averageOrderValue: number;
}

