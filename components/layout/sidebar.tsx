'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Ticket,
  CreditCard,
  Undo2,
  Users,
  Bus,
  MapPin,
  Tag,
  Headphones,
  Bell,
  ShieldCheck,
  BarChart3,
  Network,
  Settings,
  ToggleRight,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { AdminPermissionKey } from '@/types/api';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: AdminPermissionKey;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
      { name: 'Bookings', href: '/bookings', icon: Ticket, permission: 'bookings:list' },
      { name: 'Payments', href: '/payments', icon: CreditCard, permission: 'payments:list' },
      { name: 'Refunds', href: '/refunds', icon: Undo2, permission: 'refunds:list' },
    ],
  },
  {
    title: 'Fleet & Catalog',
    items: [
      { name: 'Users', href: '/users', icon: Users, permission: 'users:list' },
      { name: 'Operators', href: '/operators', icon: Bus, permission: 'operators:list' },
      { name: 'Cities', href: '/cities', icon: MapPin, permission: 'cities:list' },
      { name: 'Coupons', href: '/coupons', icon: Tag, permission: 'coupons:list' },
    ],
  },
  {
    title: 'CRM & Engagement',
    items: [
      { name: 'Support Desk', href: '/support', icon: Headphones, permission: 'support:view' },
      { name: 'Notifications', href: '/notifications', icon: Bell, permission: 'notifications:view' },
    ],
  },
  {
    title: 'Governance & Insights',
    items: [
      { name: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck, permission: 'audit:view' },
      { name: 'Reports & Export', href: '/reports', icon: BarChart3, permission: 'reports:view' },
      { name: 'Provider GDS', href: '/providers', icon: Network, permission: 'providers:view' },
    ],
  },
  {
    title: 'System Management',
    items: [
      { name: 'Configuration', href: '/system/config', icon: Settings, permission: 'system:config' },
      { name: 'Feature Flags', href: '/system/feature-flags', icon: ToggleRight, permission: 'system:feature_flags' },
      { name: 'System Telemetry', href: '/system/health', icon: Activity, permission: 'system:health' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUiStore();
  const { hasPermission } = useAuthStore();
  const storesHydrated = useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribeAuth = useAuthStore.persist.onFinishHydration(onStoreChange);
      const unsubscribeUi = useUiStore.persist.onFinishHydration(onStoreChange);
      return () => {
        unsubscribeAuth();
        unsubscribeUi();
      };
    },
    () => useAuthStore.persist.hasHydrated() && useUiStore.persist.hasHydrated(),
    () => false
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 ease-in-out',
          // Desktop collapse/expand
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
          // Mobile open/close
          mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black shadow-md">
              <Bus className="h-5 w-5 text-slate-950" />
            </div>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  AiBus <span className="text-amber-500 font-extrabold">SaaS</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Admin Platform
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {storesHydrated && NAV_SECTIONS.map((section) => {
            const filteredItems = section.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {(!sidebarCollapsed || mobileMenuOpen) && (
                  <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    {section.title}
                  </h4>
                )}

                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all group relative',
                        isActive
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-900/60'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-amber-500" />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-amber-500'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                        )}
                      />
                      {(!sidebarCollapsed || mobileMenuOpen) && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 p-3">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[11px] font-medium">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
