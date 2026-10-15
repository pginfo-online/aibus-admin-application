// ---------------------------------------------------------------------------
// AiBus Admin Panel — TanStack Query Client Configuration
// ---------------------------------------------------------------------------

import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api-client';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry authorization, validation, or client errors
          if (error instanceof ApiClientError) {
            if ([400, 401, 403, 404, 422].includes(error.status)) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false, // Never auto-retry non-idempotent mutations
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
