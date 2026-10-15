'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldAlert,
  Radio,
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { setMobileMenuOpen, theme, toggleTheme } = useUiStore();
  const { user, clearAuth } = useAuthStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignored — clear local session regardless
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-4 sm:px-6">
      {/* Left section: Mobile toggle & environment status */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
          <Radio className="h-3 w-3 animate-pulse" />
          <span>Backend Connected (Port 3009)</span>
        </div>
      </div>

      {/* Right section: Theme switcher & user profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User profile dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-bold text-xs shadow">
              {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                {user?.fullName || user?.firstName || user?.email || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {user?.role?.toLowerCase() || 'Admin'}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl text-xs z-50 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge variant="gold" size="sm">
                    {user?.role || 'ADMIN'}
                  </Badge>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
