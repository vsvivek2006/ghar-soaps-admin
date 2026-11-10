# Ghar Soaps — Dedicated Admin Dashboard

A high-performance, secure, standalone Admin Dashboard built for **Ghar Soaps**, running independently alongside the storefront.

## Tech Stack & Architecture
- **Framework:** React 18 + Vite (Blazing fast builds, instant HMR)
- **Styling:** Tailwind CSS + PostCSS
- **Icons:** Lucide React
- **Database:** Supabase Managed PostgreSQL (Mumbai `ap-south-1`)
- **Port:** Runs independently on `http://localhost:3001` (Storefront on `http://localhost:3000`)

## Features & Modules

1. **Executive Dashboard (`DashboardView`):**
   - Lifetime Gross Sales, Average Order Value, Total Orders.
   - Real-time fulfillment pipeline visual breakdown (Confirmed, Processing, Shipped, Out for Delivery, Delivered).
   - Recent incoming orders feed with 1-click status actions.

2. **Orders Management (`OrdersView`):**
   - Full tabular view of all orders synced directly with Supabase.
   - Status filters: `Confirmed`, `Processing`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`.
   - Payment filter: `Cash on Delivery (COD)` vs `Prepaid (UPI / Card)`.
   - Real-time search by Order ID, Customer Name, Phone, City, PIN code.
   - **Export to CSV:** 1-click export of orders for Excel or courier dispatch (BlueDart/Delhivery).

3. **Order Detail & Courier Dispatch Drawer (`OrderDetailModal`):**
   - Complete customer delivery address and phone number.
   - **1-Click WhatsApp:** Instant WhatsApp chat with prefilled order status update.
   - **1-Click Call:** Direct dial customer phone number.
   - Ordered items breakdown with thumbnails, variants, quantities, unit prices.
   - **Live Courier Dispatcher:** Update status, assign courier partner, and input AWB tracking number.
   - Automatically writes new milestones to `order_tracking_events` in Supabase so the customer sees updates live in the store tracking modal!

4. **Customers & VIP Leads (`CustomersView`):**
   - Unique buyers directory calculated from orders (total spent, order frequency, last order date).
   - VIP newsletter subscribers list (`subscribers` table).

5. **Product Catalog & Stock (`ProductsView`):**
   - Search across all 90 Ghar Soaps catalog products.
   - Filter by categories (Soaps, Skin Care, Body Care, Gift Boxes).
   - Price, Compare Price, Variants count, and Stock status.

6. **System & Health (`SettingsView`):**
   - Live roundtrip latency ping test to Supabase PostgreSQL database.
   - Security session status (12-hour session duration).

## Security & Protection
- **Security PIN Gate:** Unauthenticated visitors cannot view orders, customer phones, or sales data.
- **Passcode:** Configured via `VITE_ADMIN_PIN` in `.env.local` (Default: `admin123`).
- **No Hardcoded Secrets:** Keys are loaded strictly from `.env.local`.

## Getting Started

```bash
# From inside the admin directory:
cd admin
npm run dev

# Or directly from the root directory:
npm run admin:dev
```
Access the admin portal at **`http://localhost:3001`**.

