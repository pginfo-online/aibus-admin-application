import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/providers/client-providers';

export const metadata: Metadata = {
  title: 'AiBus SaaS Admin Panel | Enterprise Bus Management Platform',
  description:
    'Production-grade bus-management SaaS administrative operations platform for AiBus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
