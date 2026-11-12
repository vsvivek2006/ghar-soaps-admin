import type { Metadata } from 'next';
import './globals.css';
import { AdminProviders } from './providers';

export const metadata: Metadata = {
  title: 'Ghar Soaps — Admin Dashboard',
  description: 'Administrative portal for managing orders, shipments, and customer data.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="https://mlglwjaxvmcswesysipt.supabase.co/storage/v1/object/public/store-assets/catalog/b14de091ba-PNG-Logo-Gharsoaps.png" />
      </head>
      <body className="bg-[#f8f9fb] text-neutral-900 antialiased font-sans">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}

