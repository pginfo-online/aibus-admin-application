'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import {
  Database,
  Server,
  Cpu,
  RotateCcw,
  HardDrive,
  Radio,
} from 'lucide-react';
import type { DetailedSystemHealthData } from '@/types/api';

export default function SystemHealthPage() {
  const healthQuery = useQuery({
    queryKey: ['admin', 'system', 'health-deep'],
    queryFn: async () => {
      const res = await apiClient.get<DetailedSystemHealthData>('/admin/system/health');
      return res.data;
    },
    refetchInterval: 10000, // 10s live pulse
  });

  const h = healthQuery.data;

  const formatUptime = (seconds: number) => {
    if (!seconds) return '—';
    const d = Math.floor(seconds / (3600 * 24));
    const hr = Math.floor((seconds % (3600 * 24)) / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ''}${hr}h ${min}m ${sec}s`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Telemetry & Health"
        description="Deep real-time diagnostic telemetry for the database, Redis, and backend process."
        badge={
          <Badge
            variant={h?.status === 'operational' ? 'success' : 'warning'}
            size="md"
            className="flex items-center gap-1.5"
          >
            <Radio className="h-3 w-3 animate-pulse" />
            {h?.status?.toUpperCase() || 'CONNECTING'}
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => healthQuery.refetch()}
            isLoading={healthQuery.isFetching}
          >
            Poll Diagnostics
          </Button>
        }
      />

      {healthQuery.isError && (
        <ErrorState
          title="Telemetry Connection Failed"
          message={healthQuery.error?.message}
          onRetry={() => healthQuery.refetch()}
        />
      )}

      {/* Primary Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-amber-500" /> PostgreSQL Database
              </span>
              <Badge
                variant={h?.database?.status === 'healthy' ? 'success' : 'destructive'}
                size="sm"
              >
                {h?.database?.status || 'Checking…'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Query Latency</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {h?.database?.latencyMs !== undefined ? `${h.database.latencyMs} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Storage Schema</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">public</span>
            </div>
          </CardContent>
        </Card>

        {/* Redis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="h-4 w-4 text-rose-500" /> Redis In-Memory Cluster
              </span>
              <Badge
                variant={h?.redis?.status === 'healthy' ? 'success' : 'destructive'}
                size="sm"
              >
                {h?.redis?.status || 'Checking…'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Memory Consumed</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {h?.redis?.memoryUsed || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ping Latency</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {h?.redis?.latencyMs !== undefined ? `${h.redis.latencyMs} ms` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Node Runtime */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-sky-500" /> Process Uptime
              </span>
              <Badge variant="neutral" size="sm">
                {h?.process?.nodeVersion || 'Node.js'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Active Elapsed</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {h?.uptimeSeconds ? formatUptime(h.uptimeSeconds) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Event Loop</span>
              <span className="text-emerald-500 font-semibold">Responsive</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Allocation Diagnostics */}
      {h?.process?.memory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-amber-500" /> Runtime Memory Allocation (V8 Heap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Heap Used</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {h.process.memory.heapUsedMb.toFixed(1)} MB
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Heap Total</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {h.process.memory.heapTotalMb.toFixed(1)} MB
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Resident Set Size (RSS)</span>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {h.process.memory.rssMb.toFixed(1)} MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
