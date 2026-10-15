// ---------------------------------------------------------------------------
// AiBus Admin Panel — Centralized Production API Client
// Standard transport layer with automatic auth injection, token refresh,
// error normalization, timeout handling, and file downloads.
// ---------------------------------------------------------------------------

import { useAuthStore } from '@/store/auth-store';
import type { ApiSuccessResponse } from '@/types/api';

export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;
  public isNetworkError: boolean;

  constructor(message: string, status = 500, code = 'API_ERROR', details?: unknown, isNetworkError = false) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  timeoutMs?: number;
  skipAuth?: boolean;
}

const DEFAULT_TIMEOUT_MS = 30000;

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009/api/v1';
}

// Token refresh synchronization mutex
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const { tokens, updateTokens, clearAuth } = useAuthStore.getState();
  if (!tokens?.refreshToken) {
    clearAuth();
    return null;
  }

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const payload = await res.json();
    if (payload.success && payload.data?.accessToken) {
      const newTokens = {
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken || tokens.refreshToken,
        expiresIn: payload.data.expiresIn,
      };
      updateTokens(newTokens);
      return newTokens.accessToken;
    } else {
      clearAuth();
      return null;
    }
  } catch {
    clearAuth();
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  // Query parameter serialization
  if (options.params) {
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });
  }

  // Headers setup
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Auth header injection
  if (!options.skipAuth) {
    const accessToken = useAuthStore.getState().tokens?.accessToken;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  // Timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  // Link signals
  const compositeSignal = options.signal
    ? anySignal([options.signal, controller.signal])
    : controller.signal;

  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: compositeSignal,
      body: options.body instanceof FormData
        ? options.body
        : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
    };

    let response = await fetch(url.toString(), fetchOptions);

    // Handle 401 Unauthorized with token refresh & retry once
    if (response.status === 401 && !options.skipAuth && !endpoint.includes('/auth/')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          fetchOptions.headers = headers;
          response = await fetch(url.toString(), fetchOptions);
        } else {
          throw new ApiClientError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED');
        }
      } else {
        // Wait for active refresh
        const retryToken = await new Promise<string | null>((resolve) => {
          subscribeTokenRefresh(resolve);
        });
        if (retryToken) {
          headers.set('Authorization', `Bearer ${retryToken}`);
          fetchOptions.headers = headers;
          response = await fetch(url.toString(), fetchOptions);
        } else {
          throw new ApiClientError('Session expired. Please sign in again.', 401, 'SESSION_EXPIRED');
        }
      }
    }

    clearTimeout(timeoutId);

    // Parse JSON or error
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`;
      const errorCode = data?.error?.code || `HTTP_${response.status}`;
      const details = data?.error?.details || data?.details;

      throw new ApiClientError(errorMessage, response.status, errorCode, details);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiClientError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new ApiClientError('Request timed out or was cancelled.', 408, 'REQUEST_TIMEOUT');
    }

    throw new ApiClientError(
      err.message || 'Unable to connect to the backend server. Please verify your connection.',
      0,
      'NETWORK_ERROR',
      undefined,
      true
    );
  }
}

/**
 * Polyfill for Promise.any or signal merging
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

// Convenient typed helper methods
export const apiClient = {
  get: <T>(endpoint: string, params?: RequestOptions['params'], options?: RequestOptions) =>
    request<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'GET', params }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'PATCH', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<ApiSuccessResponse<T>>(endpoint, { ...options, method: 'DELETE' }),

  download: async (endpoint: string, params?: RequestOptions['params'], filename = 'export.csv') => {
    const baseUrl = getApiBaseUrl();
    const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }

    const headers = new Headers();
    const accessToken = useAuthStore.getState().tokens?.accessToken;
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    const res = await fetch(url.toString(), { method: 'GET', headers });
    if (!res.ok) {
      throw new ApiClientError(`Download failed with status ${res.status}`, res.status);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  },
};
