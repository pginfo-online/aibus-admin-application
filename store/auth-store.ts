import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser, AuthTokens, AdminPermissionKey } from '@/types/api';

// Derived from backend admin.permissions.ts
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPPORT: [
    'dashboard:view',
    'users:list',
    'users:view',
    'bookings:list',
    'bookings:view',
    'payments:list',
    'payments:view',
    'refunds:list',
    'refunds:view',
    'cities:list',
    'operators:list',
    'operators:view',
    'coupons:list',
    'coupons:view',
    'support:view',
    'support:manage',
    'notifications:view',
    'audit:view',
    'reports:view',
    'providers:view',
    'system:health',
  ],
  SUPPORT_AGENT: [
    'dashboard:view',
    'users:list',
    'users:view',
    'bookings:list',
    'bookings:view',
    'payments:list',
    'payments:view',
    'refunds:list',
    'refunds:view',
    'cities:list',
    'operators:list',
    'operators:view',
    'coupons:list',
    'coupons:view',
    'support:view',
    'support:manage',
    'notifications:view',
    'audit:view',
    'reports:view',
    'providers:view',
    'system:health',
  ],
  ADMIN: [
    'dashboard:view',
    'users:list',
    'users:view',
    'users:update',
    'users:suspend',
    'bookings:list',
    'bookings:view',
    'bookings:update_status',
    'bookings:cancel',
    'bookings:reconcile',
    'payments:list',
    'payments:view',
    'payments:reconcile',
    'refunds:list',
    'refunds:view',
    'refunds:process',
    'refunds:retry',
    'cities:list',
    'cities:manage',
    'operators:list',
    'operators:view',
    'operators:manage',
    'coupons:list',
    'coupons:view',
    'coupons:manage',
    'support:view',
    'support:manage',
    'notifications:view',
    'notifications:manage',
    'notifications:broadcast',
    'audit:view',
    'audit:export',
    'reports:view',
    'reports:export',
    'providers:view',
    'system:health',
    'agents:list',
    'agents:view',
    'agents:kyc_review',
    'agents:suspend',
    'agents:credit_manage',
    'commissions:list',
    'commissions:manage',
    'ledger:view',
    'ledger:reconcile',
    'ledger:adjust',
    'payments:gateways_manage',
  ],
  SUPER_ADMIN: [
    'dashboard:view',
    'users:list',
    'users:view',
    'users:update',
    'users:suspend',
    'users:delete',
    'bookings:list',
    'bookings:view',
    'bookings:update_status',
    'bookings:cancel',
    'bookings:reconcile',
    'payments:list',
    'payments:view',
    'payments:reconcile',
    'payments:gateways_manage',
    'refunds:list',
    'refunds:view',
    'refunds:process',
    'refunds:retry',
    'cities:list',
    'cities:manage',
    'operators:list',
    'operators:view',
    'operators:manage',
    'coupons:list',
    'coupons:view',
    'coupons:manage',
    'support:view',
    'support:manage',
    'notifications:view',
    'notifications:manage',
    'notifications:broadcast',
    'audit:view',
    'audit:export',
    'system:config',
    'system:feature_flags',
    'system:health',
    'reports:view',
    'reports:export',
    'providers:view',
    'providers:manage',
    'agents:list',
    'agents:view',
    'agents:kyc_review',
    'agents:suspend',
    'agents:credit_manage',
    'commissions:list',
    'commissions:manage',
    'ledger:view',
    'ledger:reconcile',
    'ledger:adjust',
  ],
};

interface AuthState {
  user: AdminUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AdminUser, tokens: AuthTokens) => void;
  updateTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
  hasPermission: (permission: AdminPermissionKey) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, tokens) => {
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      },

      updateTokens: (tokens) => {
        set((state) => ({ ...state, tokens }));
      },

      clearAuth: () => {
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      },

      hasPermission: (permission: AdminPermissionKey) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        const perms = ROLE_PERMISSIONS[user.role] || [];
        return perms.includes(permission);
      },

      isSuperAdmin: () => {
        const { user } = get();
        return user?.role === 'SUPER_ADMIN';
      },
    }),
    {
      name: 'aibus_admin_auth',
      partialize: (state) => ({ user: state.user, tokens: state.tokens, isAuthenticated: state.isAuthenticated }),
      skipHydration: true,
    }
  )
);
