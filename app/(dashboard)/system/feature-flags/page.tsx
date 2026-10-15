'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import {
  ToggleRight,
  Plus,
  RotateCcw,
  ToggleLeft,
  Check,
  X,
} from 'lucide-react';
import type { FeatureFlagItem } from '@/types/api';

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [flagKey, setFlagKey] = useState('');
  const [flagDesc, setFlagDesc] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(false);

  // Fetch Feature Flags
  const flagsQuery = useQuery({
    queryKey: ['admin', 'system', 'feature-flags'],
    queryFn: async () => {
      const res = await apiClient.get<FeatureFlagItem[]>('/admin/system/feature-flags');
      return res.data || [];
    },
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      return apiClient.patch(`/admin/system/feature-flags/${key}`, { enabled });
    },
    onSuccess: () => {
      toast.success('Feature flag toggled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'feature-flags'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to toggle flag');
    },
  });

  // Create Flag Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/system/feature-flags', {
        key: flagKey.toUpperCase().trim(),
        description: flagDesc || undefined,
        enabled: flagEnabled,
      });
    },
    onSuccess: () => {
      toast.success('Feature flag created');
      setModalOpen(false);
      setFlagKey('');
      setFlagDesc('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'feature-flags'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create flag');
    },
  });

  const flags = flagsQuery.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags & Circuit Breakers"
        description="Toggle operational capabilities dynamically without deploying code or restarting services."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => flagsQuery.refetch()}
              isLoading={flagsQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setModalOpen(true)}
            >
              New Flag
            </Button>
          </div>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Flag Identifier</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Last Updated</th>
                <th className="p-3.5 text-right">Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {flagsQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)
              ) : flagsQuery.isError ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <ErrorState
                      title="Failed to load feature flags"
                      message={flagsQuery.error?.message}
                      onRetry={() => flagsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      title="No feature flags created"
                      description="No feature flags are currently configured."
                      actionLabel="Create Feature Flag"
                      onAction={() => setModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr
                    key={flag.key}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {flag.key}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {flag.description || '—'}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={flag.enabled ? 'success' : 'neutral'} size="sm">
                        {flag.enabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(flag.updatedAt)}
                    </td>

                    <td className="p-3.5 text-right">
                      <Button
                        variant={flag.enabled ? 'outline' : 'gold'}
                        size="sm"
                        className="h-7 text-xs"
                        isLoading={toggleMutation.isPending && toggleMutation.variables?.key === flag.key}
                        onClick={() =>
                          toggleMutation.mutate({
                            key: flag.key,
                            enabled: !flag.enabled,
                          })
                        }
                      >
                        {flag.enabled ? (
                          <span className="flex items-center gap-1 text-rose-500">
                            <X className="h-3 w-3" /> Disable
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-950 font-bold">
                            <Check className="h-3 w-3" /> Enable
                          </span>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Flag Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Create Feature Flag"
        description="Register a new toggleable feature switch or operational circuit breaker."
      >
        <div className="space-y-4">
          <Input
            label="Flag Identifier (Alphanumeric, e.g. ENABLE_WALLET_CHECKOUT)"
            value={flagKey}
            onChange={(e) => setFlagKey(e.target.value.toUpperCase())}
            placeholder="e.g. ENABLE_GDS_LIVE_SYNC"
          />

          <Input
            label="Description"
            value={flagDesc}
            onChange={(e) => setFlagDesc(e.target.value)}
            placeholder="e.g. Controls whether live inventory sync is enabled"
          />

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={flagEnabled}
              onChange={(e) => setFlagEnabled(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span>Enable flag immediately upon creation</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={createMutation.isPending}
              disabled={!flagKey.trim()}
              onClick={() => createMutation.mutate()}
            >
              Create Flag
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
