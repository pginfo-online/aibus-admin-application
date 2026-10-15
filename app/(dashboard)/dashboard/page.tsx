'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import Link from 'next/link';
import {
  DollarSign,
  Ticket,
  Users,
  AlertTriangle,
  RotateCcw,
  Activity,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Bus,
  Headphones,
  Undo2,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import type { DashboardOverviewData, RevenueAnalyticsData, SystemHealthData } from '@/types/api';

export default function DashboardPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | '1y'>('30d');

  // 1. Fetch Overview KPIs
  const overviewQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'overview', period],
    queryFn: async () => {
      const res = await apiClient.get<DashboardOverviewData>('/admin/dashboard/overview', { period });
      return res.data;
    },
  });

  // 2. Fetch Revenue Analytics
  const revenueQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'revenue', period],
    queryFn: async () => {
      const res = await apiClient.get<RevenueAnalyticsData>('/admin/dashboard/revenue', {
        period: period === 'today' ? 'daily' : 'monthly',
      });
      return res.data;
    },
  });

  // 3. Fetch System Health
  const healthQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'system'],
    queryFn: async () => {
      const res = await apiClient.get<SystemHealthData>('/admin/dashboard/system');
      return res.data;
    },
    refetchInterval: 30000, // 30s live poll for telemetry
  });

  const overview = overviewQuery.data;
  const revenue = revenueQuery.data;
  const health = healthQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Overview"
        description="Real-time operational metrics, revenue analytics, and system telemetry across all bus domains."
        actions={
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-xs">
              {(['today', '7d', '30d', '90d', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    period === p
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                overviewQuery.refetch();
                revenueQuery.refetch();
                healthQuery.refetch();
              }}
              isLoading={overviewQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {overviewQuery.isError && (
        <ErrorState
          title="Failed to fetch dashboard overview"
          message={overviewQuery.error?.message}
          onRetry={() => overviewQuery.refetch()}
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {formatCurrency(overview?.revenue?.total ?? 0)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-500 font-semibold flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5 inline" />
                    {formatCurrency(overview?.revenue?.inPeriod ?? 0)}
                  </span>
                  <span>in selected period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bookings & Conversion */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bookings
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Ticket className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {(overview?.bookings?.total ?? 0).toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Badge variant="success" size="sm">
                    {overview?.bookings?.confirmed ?? 0} confirmed
                  </Badge>
                  <span>({overview?.bookings?.conversionRate ?? '0.00'}% conv.)</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Registered Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Users
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {(overview?.users?.total ?? 0).toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-sky-500 font-semibold">
                    +{overview?.users?.newInPeriod ?? 0} new
                  </span>
                  <span>in selected period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Items / Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Actions
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {(overview?.operations.pendingRefunds || 0) +
                    (overview?.operations.openSupportTickets || 0)}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Link
                    href="/refunds"
                    className="text-rose-500 hover:underline font-medium"
                  >
                    {overview?.operations.pendingRefunds} refunds
                  </Link>
                  <span>•</span>
                  <Link
                    href="/support"
                    className="text-amber-500 hover:underline font-medium"
                  >
                    {overview?.operations.openSupportTickets} tickets
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Top Operators & Inventory Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Operators by Revenue */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Bus Operators by Volume</CardTitle>
              <CardDescription>
                Gross revenue contribution and confirmed bookings per operator
              </CardDescription>
            </div>
            <Link href="/operators">
              <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {revenueQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : revenue?.byOperator && revenue.byOperator.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {revenue.byOperator.map((op, idx) => (
                  <div key={op.operatorName} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {op.operatorName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {op.bookings} confirmed bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(op.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No operator transaction records in this period yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live System Diagnostics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" /> System Telemetry
              </CardTitle>
              <CardDescription>Live health and database connections</CardDescription>
            </div>
            <Badge
              variant={health?.status === 'healthy' ? 'success' : 'warning'}
              size="sm"
            >
              {health?.status || 'Active'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Database className="h-3.5 w-3.5 text-amber-500" /> PostgreSQL DB
                </span>
                <Badge variant={health?.services.database.status === 'connected' ? 'success' : 'destructive'} size="sm">
                  {health?.services.database.status || 'connected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Server className="h-3.5 w-3.5 text-rose-500" /> Redis Cache
                </span>
                <Badge variant={health?.services.redis.status === 'connected' ? 'success' : 'destructive'} size="sm">
                  {health?.services.redis.status || 'connected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Cpu className="h-3.5 w-3.5 text-sky-500" /> Process Uptime
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {health?.uptime ? `${Math.floor(health.uptime / 60)} mins` : '—'}
                </span>
              </div>
            </div>

            {/* Catalog quick counters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" /> Cities
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {overview?.inventory.totalCities || 0}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
                  <Bus className="h-3.5 w-3.5 text-sky-500" /> Operators
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {overview?.inventory.totalOperators || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Fast Action Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/bookings">
          <Card className="hover:border-amber-500/50 transition-colors cursor-pointer p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Bookings</p>
              <p className="text-[11px] text-slate-400">Search & override</p>
            </div>
          </Card>
        </Link>

        <Link href="/refunds">
          <Card className="hover:border-amber-500/50 transition-colors cursor-pointer p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Refunds</p>
              <p className="text-[11px] text-slate-400">Process & retries</p>
            </div>
          </Card>
        </Link>

        <Link href="/support">
          <Card className="hover:border-amber-500/50 transition-colors cursor-pointer p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Support Desk</p>
              <p className="text-[11px] text-slate-400">Customer tickets</p>
            </div>
          </Card>
        </Link>

        <Link href="/reports">
          <Card className="hover:border-amber-500/50 transition-colors cursor-pointer p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Reports</p>
              <p className="text-[11px] text-slate-400">Download CSV</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
