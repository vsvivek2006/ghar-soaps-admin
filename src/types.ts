export type OrderStatus =
  | 'Pending Payment'
  | 'Payment Failed'
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
  payment_status?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
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

export type InquiryStatus = 'New' | 'In Progress' | 'Resolved';

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  order_id?: string;
  message: string;
  status: InquiryStatus;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface RazorpayLivePayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'captured' | 'authorized' | 'failed' | 'refunded';
  order_id: string | null;
  invoice_id: string | null;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  card?: {
    network?: string;
    last4?: string;
    type?: string;
    issuer?: string;
  } | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  error_code?: string | null;
  error_description?: string | null;
  error_reason?: string | null;
  created_at: string;
  order?: {
    id: string;
    tracking_number?: string;
    customer_name: string;
    phone: string;
    status: string;
    payment_status: string;
  } | null;
}

export interface RazorpayGatewayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes?: Record<string, string>;
  created_at: string;
  order?: {
    id: string;
    tracking_number?: string;
    customer_name: string;
    phone: string;
    email?: string;
    status: string;
    payment_status: string;
  } | null;
  customer_details?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface PaymentWebhookEvent {
  event_id: string;
  event_type: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  method?: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  error_code?: string | null;
  error_description?: string | null;
  error_reason?: string | null;
  payload?: any;
  processed_at: string;
}

export interface PaymentDashboardStats {
  total_volume: number;
  total_captured_count: number;
  failed_count: number;
  refunded_count: number;
  refunded_volume: number;
  success_rate: number;
  total_attempts: number;
  total_orders_created: number;
  orders_created_volume: number;
  estimated_fees: number;
  net_settlement_volume: number;
  method_breakdown: Record<string, number>;
  failure_reasons_breakdown?: Record<string, number>;
}

export interface GatewayInfo {
  key_id: string;
  masked_key: string;
  is_live: boolean;
  webhook_url: string;
  webhook_secret?: string;
  webhook_secret_configured: boolean;
  gateway_error?: string | null;
}

