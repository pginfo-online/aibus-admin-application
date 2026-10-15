'use client';

import React, { Suspense, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { sidebarCollapsed } = useUiStore();
  const authHydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [authHydrated, isAuthenticated, router]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Fixed Sidebar */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <Header />
        <main
          aria-hidden={!authHydrated || !isAuthenticated}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto"
        >
          <Suspense
            fallback={
              <div className="flex min-h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
      {(!authHydrated || !isAuthenticated) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
          <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs font-medium text-slate-400">Loading AiBus Platform...</p>
          </div>
        </div>
      )}
    </div>
  );
}
