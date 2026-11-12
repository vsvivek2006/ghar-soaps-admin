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

export interface RegisteredCustomer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed: boolean;
  totalSpent: number;
  orderCount: number;
  lastOrderDate?: string;
  role?: string;
  orders?: Order[];
}

export interface EditableProduct {
  id: number | string;
  title: string;
  handle: string;
  price: number;
  compare_at_price?: number;
  rating?: number;
  reviews_count?: number;
  badge?: string;
  category: string;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  tags?: string[];
  images: string[];
  description?: string;
}
