'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from '@/store/toast-store';
import {
  Settings,
  Plus,
  RotateCcw,
  Edit2,
  Trash2,
  Lock,
  Key,
} from 'lucide-react';
import type { SystemConfigItem, SystemConfigType } from '@/types/api';

export default function SystemConfigPage() {
  const queryClient = useQueryClient();

  const [group, setGroup] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [configKey, setConfigKey] = useState('');
  const [configValue, setConfigValue] = useState('');
  const [configType, setConfigType] = useState<SystemConfigType>('STRING');
  const [configDesc, setConfigDesc] = useState('');
  const [configGroup, setConfigGroup] = useState('general');
  const [isSecret, setIsSecret] = useState(false);

  // Delete modal
  const [deleteConfig, setDeleteConfig] = useState<SystemConfigItem | null>(null);

  // Fetch Configs
  const configQuery = useQuery({
    queryKey: ['admin', 'system', 'config', { group }],
    queryFn: async () => {
      const res = await apiClient.get<SystemConfigItem[]>('/admin/system/config', {
        group: group || undefined,
      });
      return res.data || [];
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingConfig) {
        return apiClient.patch(`/admin/system/config/${editingConfig.key}`, {
          value: configValue,
          description: configDesc || undefined,
          group: configGroup || undefined,
          isSecret,
        });
      } else {
        return apiClient.post('/admin/system/config', {
          key: configKey,
          value: configValue,
          type: configType,
          description: configDesc || undefined,
          group: configGroup || 'general',
          isSecret,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingConfig ? 'Configuration updated' : 'Configuration key added');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'config'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save configuration');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiClient.delete(`/admin/system/config/${key}`);
    },
    onSuccess: () => {
      toast.success('Configuration key removed');
      setDeleteConfig(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'config'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove configuration');
    },
  });

  const openCreateModal = () => {
    setEditingConfig(null);
    setConfigKey('');
    setConfigValue('');
    setConfigType('STRING');
    setConfigDesc('');
    setConfigGroup('general');
    setIsSecret(false);
    setModalOpen(true);
  };

  const openEditModal = (cfg: SystemConfigItem) => {
    setEditingConfig(cfg);
    setConfigKey(cfg.key);
    setConfigValue(cfg.value);
    setConfigType(cfg.type);
    setConfigDesc(cfg.description || '');
    setConfigGroup(cfg.group || 'general');
    setIsSecret(cfg.isSecret);
    setModalOpen(true);
  };

  const configs = configQuery.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic System Configuration"
        description="Modify runtime environment parameters, business thresholds, and external API keys with secret masking."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => configQuery.refetch()}
              isLoading={configQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
            >
              Add Setting
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Filter by config group (e.g. general, gds, payments)..."
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </Card>

      {/* Configuration Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Key Name</th>
                <th className="p-3.5">Group</th>
                <th className="p-3.5">Value</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {configQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
              ) : configQuery.isError ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <ErrorState
                      title="Failed to load configuration"
                      message={configQuery.error?.message}
                      onRetry={() => configQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      title="No configuration settings found"
                      description="No dynamic settings have been registered yet."
                      actionLabel="Add First Setting"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                configs.map((cfg) => (
                  <tr
                    key={cfg.key}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {cfg.key}
                    </td>

                    <td className="p-3.5">
                      <Badge variant="neutral" size="sm">
                        {cfg.group}
                      </Badge>
                    </td>

                    <td className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                      {cfg.isSecret ? (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Lock className="h-3 w-3 inline" /> ••••••••
                        </span>
                      ) : (
                        <span className="truncate max-w-[200px] block">{cfg.value}</span>
                      )}
                    </td>

                    <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                      {cfg.type}
                    </td>

                    <td className="p-3.5 text-slate-500 truncate max-w-[240px]">
                      {cfg.description || '—'}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => openEditModal(cfg)}
                          title="Edit value"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-600"
                          onClick={() => setDeleteConfig(cfg)}
                          title="Delete setting"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit / Create Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingConfig ? `Edit Setting: ${editingConfig.key}` : 'Add Configuration Setting'}
        description="Configure runtime environment key-value pairs with automatic secret masking."
      >
        <div className="space-y-4">
          <Input
            label="Setting Key (Alphanumeric, e.g. GDS_CACHE_TTL)"
            value={configKey}
            disabled={!!editingConfig}
            onChange={(e) => setConfigKey(e.target.value)}
            placeholder="e.g. PAYMENT_RETRY_LIMIT"
          />

          <Input
            label="Setting Value"
            value={configValue}
            onChange={(e) => setConfigValue(e.target.value)}
            placeholder="Value..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Data Type"
              value={configType}
              disabled={!!editingConfig}
              onChange={(e) => setConfigType(e.target.value as any)}
            >
              <option value="STRING">STRING</option>
              <option value="NUMBER">NUMBER</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="JSON">JSON</option>
            </Select>

            <Input
              label="Config Group"
              value={configGroup}
              onChange={(e) => setConfigGroup(e.target.value)}
              placeholder="e.g. general, payments"
            />
          </div>

          <Input
            label="Description / Purpose"
            value={configDesc}
            onChange={(e) => setConfigDesc(e.target.value)}
            placeholder="Document what this configuration drives..."
          />

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span>Sensitive / Secret (mask value in UI and audit logs)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editingConfig ? 'Save Changes' : 'Create Setting'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteConfig && (
        <ConfirmationDialog
          open={!!deleteConfig}
          onOpenChange={(open) => !open && setDeleteConfig(null)}
          title={`Delete Setting: ${deleteConfig.key}`}
          description="Are you sure you want to delete this configuration setting? Applications will fall back to their environment defaults."
          confirmLabel="Delete Setting"
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteConfig.key)}
        />
      )}
    </div>
  );
}
