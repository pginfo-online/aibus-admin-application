'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import {
  Percent,
  Plus,
  RotateCcw,
  Tag,
  Sliders,
  Trash2,
  Edit,
  Power,
  Layers,
  ArrowUpDown,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { CommissionRuleItem, PaginationMeta, CommissionRuleType, CreateCommissionRuleInput } from '@/types/api';

export default function CommissionsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [operatorName, setOperatorName] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCommissionRuleInput>({
    name: '',
    ruleType: 'FLAT_PERCENTAGE',
    agentId: null,
    operatorName: '',
    fromCityId: null,
    toCityId: null,
    percentage: 5.0,
    flatAmount: null,
    minFare: null,
    maxCommission: null,
    priority: 10,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveUntil: null,
  });

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<CommissionRuleItem | null>(null);

  // List Rules Query
  const rulesQuery = useQuery({
    queryKey: ['admin', 'commissions', 'rules', { page, limit, operatorName, isActiveFilter }],
    queryFn: async () => {
      const res = await apiClient.get<{ rules: CommissionRuleItem[]; pagination: PaginationMeta }>(
        '/admin/commissions/rules',
        {
          page,
          limit,
          operatorName: operatorName || undefined,
          isActive: isActiveFilter !== '' ? isActiveFilter : undefined,
        }
      );
      return res.data;
    },
  });

  // Create / Update Mutation
  const saveRuleMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Rule name is required');

      const payload = {
        ...form,
        agentId: form.agentId || null,
        operatorName: form.operatorName || null,
        fromCityId: form.fromCityId ? Number(form.fromCityId) : null,
        toCityId: form.toCityId ? Number(form.toCityId) : null,
        percentage: form.percentage !== null && form.percentage !== undefined ? Number(form.percentage) : null,
        flatAmount: form.flatAmount !== null && form.flatAmount !== undefined ? Number(form.flatAmount) : null,
        minFare: form.minFare !== null && form.minFare !== undefined ? Number(form.minFare) : null,
        maxCommission: form.maxCommission !== null && form.maxCommission !== undefined ? Number(form.maxCommission) : null,
        priority: Number(form.priority) || 0,
        effectiveFrom: form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : new Date().toISOString(),
        effectiveUntil: form.effectiveUntil ? new Date(form.effectiveUntil).toISOString() : null,
      };

      if (editingRuleId) {
        return apiClient.patch(`/admin/commissions/rules/${editingRuleId}`, payload);
      } else {
        return apiClient.post('/admin/commissions/rules', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingRuleId ? 'Commission rule updated' : 'Commission rule created');
      setModalOpen(false);
      setEditingRuleId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save commission rule');
    },
  });

  // Toggle Rule Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiClient.post(`/admin/commissions/rules/${ruleId}/toggle`);
    },
    onSuccess: () => {
      toast.success('Rule activation status toggled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to toggle rule');
    },
  });

  // Delete Rule Mutation
  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiClient.delete(`/admin/commissions/rules/${ruleId}`);
    },
    onSuccess: () => {
      toast.success('Commission rule deleted');
      setDeleteModalOpen(false);
      setRuleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete rule');
    },
  });

  const rules = rulesQuery.data?.rules || [];
  const pagination = rulesQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    setForm({
      name: '',
      ruleType: 'FLAT_PERCENTAGE',
      agentId: null,
      operatorName: '',
      fromCityId: null,
      toCityId: null,
      percentage: 5.0,
      flatAmount: null,
      minFare: null,
      maxCommission: null,
      priority: 10,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveUntil: null,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: CommissionRuleItem) => {
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      ruleType: rule.ruleType,
      agentId: rule.agentId || null,
      operatorName: rule.operatorName || '',
      fromCityId: rule.fromCityId || null,
      toCityId: rule.toCityId || null,
      percentage: rule.percentage !== null && rule.percentage !== undefined ? Number(rule.percentage) : null,
      flatAmount: rule.flatAmount !== null && rule.flatAmount !== undefined ? Number(rule.flatAmount) : null,
      minFare: rule.minFare !== null && rule.minFare !== undefined ? Number(rule.minFare) : null,
      maxCommission: rule.maxCommission !== null && rule.maxCommission !== undefined ? Number(rule.maxCommission) : null,
      priority: rule.priority,
      effectiveFrom: rule.effectiveFrom ? rule.effectiveFrom.split('T')[0] : '',
      effectiveUntil: rule.effectiveUntil ? rule.effectiveUntil.split('T')[0] : null,
    });
    setModalOpen(true);
  };

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission Rules & Partner Revenue Engine"
        description="Configure priority-ordered commission resolutions for B2B partner agents, operators, and specific routes."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => rulesQuery.refetch()}
              isLoading={rulesQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleOpenCreate}
            >
              New Commission Rule
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Defined Rules</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {pagination.total}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Priority resolution rules</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active In Engine</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {activeRulesCount}
          </p>
          <p className="text-xs text-emerald-600/70 mt-0.5">Live commission rules</p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Priority Floor</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            0 to 100
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Highest priority applied first</p>
        </Card>

        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Snapshot Immutability</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            Guaranteed
          </p>
          <p className="text-xs text-amber-600/70 mt-0.5">Immutable per booking</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search by operator name..."
            leftIcon={<Search className="h-4 w-4" />}
            value={operatorName}
            onChange={(e) => {
              setOperatorName(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses (Active & Inactive)</option>
            <option value="true">Active Rules Only</option>
            <option value="false">Inactive Rules Only</option>
          </Select>
        </div>
      </Card>

      {/* Rules Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Rule Name & Scope</th>
                <th className="p-3.5">Rule Type</th>
                <th className="p-3.5 text-center">Priority</th>
                <th className="p-3.5 text-right">Commission Rate / Amount</th>
                <th className="p-3.5">Fare Caps</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rulesQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : rulesQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load commission rules"
                      message={rulesQuery.error?.message}
                      onRetry={() => rulesQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No commission rules found"
                      description="No rules matched the criteria. Create a rule to configure partner commissions."
                      actionLabel="Create First Rule"
                      onAction={handleOpenCreate}
                    />
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {rule.name}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {rule.agent?.businessName ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Agency: {rule.agent.businessName}
                          </span>
                        ) : rule.operatorName ? (
                          <span>Operator: {rule.operatorName}</span>
                        ) : rule.fromCityId && rule.toCityId ? (
                          <span>Route: City {rule.fromCityId} → {rule.toCityId}</span>
                        ) : (
                          <span className="text-slate-400">Global Default Platform Policy</span>
                        )}
                      </p>
                    </td>

                    <td className="p-3.5">
                      <Badge variant="neutral" size="sm">
                        {rule.ruleType.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {rule.priority}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {rule.percentage !== null && rule.percentage !== undefined ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                          {Number(rule.percentage).toFixed(2)}%
                        </span>
                      ) : rule.flatAmount !== null && rule.flatAmount !== undefined ? (
                        <span className="text-sky-600 dark:text-sky-400 text-sm">
                          {formatCurrency(Number(rule.flatAmount))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {rule.minFare ? `Min: ${formatCurrency(Number(rule.minFare))} • ` : ''}
                      {rule.maxCommission ? `Cap: ${formatCurrency(Number(rule.maxCommission))}` : 'No Cap'}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={rule.isActive ? 'success' : 'neutral'} size="sm">
                        {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleOpenEdit(rule)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs ${
                            rule.isActive ? 'text-amber-500' : 'text-emerald-600'
                          }`}
                          onClick={() => toggleMutation.mutate(rule.id)}
                          isLoading={toggleMutation.isPending && toggleMutation.variables === rule.id}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-500 hover:text-rose-600"
                          onClick={() => {
                            setRuleToDelete(rule);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.total > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              meta={pagination}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* Create / Edit Rule Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-500" />
              {editingRuleId ? 'Edit Commission Rule' : 'New Commission Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure engine resolution rules, fee calculation basis, and priority ordering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              label="Rule Name *"
              placeholder="e.g. Standard 5% Travel Agent Commission"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Rule Strategy / Type *"
                value={form.ruleType}
                onChange={(e) => setForm({ ...form, ruleType: e.target.value as CommissionRuleType })}
              >
                <option value="FLAT_PERCENTAGE">FLAT_PERCENTAGE (Standard %)</option>
                <option value="FLAT_AMOUNT">FLAT_AMOUNT (Fixed ₹ Per Ticket)</option>
                <option value="OPERATOR_SPECIFIC">OPERATOR_SPECIFIC (Specific Fleet)</option>
                <option value="ROUTE_SPECIFIC">ROUTE_SPECIFIC (Origin → Destination)</option>
                <option value="TIERED_BOOKING">TIERED_BOOKING (Volume Slab)</option>
              </Select>

              <Input
                label="Evaluation Priority (0-100) *"
                type="number"
                min={0}
                max={100}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                helperText="Higher priority rules evaluate first before falling back"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Commission Percentage (%)"
                type="number"
                step="0.1"
                min={0}
                max={100}
                placeholder="e.g. 5.5"
                value={form.percentage !== null && form.percentage !== undefined ? form.percentage : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    percentage: e.target.value !== '' ? Number(e.target.value) : null,
                  })
                }
              />

              <Input
                label="Flat Commission Amount (₹)"
                type="number"
                min={0}
                placeholder="e.g. 50"
                value={form.flatAmount !== null && form.flatAmount !== undefined ? form.flatAmount : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    flatAmount: e.target.value !== '' ? Number(e.target.value) : null,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Minimum Base Fare Floor (₹)"
                type="number"
                placeholder="e.g. 300"
                value={form.minFare !== null && form.minFare !== undefined ? form.minFare : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minFare: e.target.value !== '' ? Number(e.target.value) : null,
                  })
                }
                helperText="Commission only applies if base fare >= floor"
              />

              <Input
                label="Maximum Commission Cap (₹)"
                type="number"
                placeholder="e.g. 200"
                value={form.maxCommission !== null && form.maxCommission !== undefined ? form.maxCommission : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxCommission: e.target.value !== '' ? Number(e.target.value) : null,
                  })
                }
                helperText="Ceiling cap on earned commission"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rule Target Scope (Optional Overrides)
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Operator Name (Optional)"
                  placeholder="e.g. VRL Travels"
                  value={form.operatorName || ''}
                  onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                />

                <Input
                  label="Agent UUID (Optional Override)"
                  placeholder="Leave empty for global policy"
                  value={form.agentId || ''}
                  onChange={(e) => setForm({ ...form, agentId: e.target.value || null })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="From City ID"
                  type="number"
                  placeholder="e.g. 101"
                  value={form.fromCityId !== null && form.fromCityId !== undefined ? form.fromCityId : ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fromCityId: e.target.value !== '' ? Number(e.target.value) : null,
                    })
                  }
                />

                <Input
                  label="To City ID"
                  type="number"
                  placeholder="e.g. 205"
                  value={form.toCityId !== null && form.toCityId !== undefined ? form.toCityId : ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      toCityId: e.target.value !== '' ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Effective From *"
                type="date"
                value={form.effectiveFrom || ''}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
              <Input
                label="Effective Until (Optional)"
                type="date"
                value={form.effectiveUntil || ''}
                onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value || null })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              isLoading={saveRuleMutation.isPending}
              onClick={() => saveRuleMutation.mutate()}
            >
              {editingRuleId ? 'Update Rule' : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <ConfirmationDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={`Delete Rule: ${ruleToDelete?.name}`}
        description="Are you sure you want to delete this commission rule? Existing confirmed bookings with snapshots will remain unaffected."
        confirmLabel="Delete Rule"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (ruleToDelete) deleteMutation.mutate(ruleToDelete.id);
        }}
      />
    </div>
  );
}
