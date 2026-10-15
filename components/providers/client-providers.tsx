'use client';

import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { ToastContainer } from '@/components/ui/toast';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const { theme } = useUiStore();

  useEffect(() => {
    Promise.all([
      useAuthStore.persist.rehydrate(),
      useUiStore.persist.rehydrate(),
    ]).catch((error) => {
      console.error('Failed to restore persisted admin state', error);
    });
  }, []);

  useEffect(() => {
    // Sync theme class to html root
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
}
