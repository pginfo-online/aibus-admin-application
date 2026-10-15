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
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Search,
  Plus,
  RotateCcw,
  Bus,
  Edit2,
  Eye,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { OperatorListItem, PaginationMeta, OperatorStatus } from '@/types/api';

export default function OperatorsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'totalBookings' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorListItem | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [commissionPct, setCommissionPct] = useState(0);
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Suspend modal
  const [suspendOperator, setSuspendOperator] = useState<OperatorListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('Compliance verification required');

  // Activate modal
  const [activateOperator, setActivateOperator] = useState<OperatorListItem | null>(null);

  // Fetch Operators
  const operatorsQuery = useQuery({
    queryKey: ['admin', 'operators', 'list', { page, limit, search, status, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<OperatorListItem[]>('/admin/operators', {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Save Operator Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        code: code.toUpperCase(),
        contactEmail,
        contactPhone,
        commissionPct: Number(commissionPct),
        gstNumber: gstNumber || undefined,
        panNumber: panNumber || undefined,
        city: city || undefined,
        state: state || undefined,
      };

      if (editingOperator) {
        return apiClient.patch(`/admin/operators/${editingOperator.id}`, payload);
      } else {
        return apiClient.post('/admin/operators', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingOperator ? 'Operator updated successfully' : 'Operator onboarded successfully');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operators'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save operator');
    },
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.post(`/admin/operators/${id}/suspend`, { reason });
    },
    onSuccess: () => {
      toast.success('Operator suspended');
      setSuspendOperator(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operators'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suspend operator');
    },
  });

  // Activate Mutation
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/operators/${id}/activate`);
    },
    onSuccess: () => {
      toast.success('Operator activated');
      setActivateOperator(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operators'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to activate operator');
    },
  });

  const openCreateModal = () => {
    setEditingOperator(null);
    setName('');
    setCode('');
    setContactEmail('');
    setContactPhone('');
    setCommissionPct(5);
    setGstNumber('');
    setPanNumber('');
    setCity('');
    setState('');
    setModalOpen(true);
  };

  const openEditModal = (op: OperatorListItem) => {
    setEditingOperator(op);
    setName(op.name);
    setCode(op.code);
    setContactEmail(op.contactEmail);
    setContactPhone(op.contactPhone);
    setCommissionPct(op.commissionPct || 0);
    setGstNumber(op.gstNumber || '');
    setPanNumber(op.panNumber || '');
    setCity(op.city || '');
    setState(op.state || '');
    setModalOpen(true);
  };

  const operators = operatorsQuery.data?.items || [];
  const pagination = operatorsQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bus Operator Management"
        description="Onboard bus fleet operators, track commission settlements, and enforce service-level compliance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => operatorsQuery.refetch()}
              isLoading={operatorsQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
            >
              Onboard Operator
            </Button>
          </div>
        }
      />

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search by operator name, code, contact..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="DEACTIVATED">DEACTIVATED</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name">Sort: Name</option>
            <option value="code">Sort: Code</option>
            <option value="createdAt">Sort: Created Date</option>
          </Select>

          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="asc">Order: Ascending</option>
            <option value="desc">Order: Descending</option>
          </Select>
        </div>
      </Card>

      {/* Operators Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Operator</th>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-right">Commission %</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {operatorsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : operatorsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load operators"
                      message={operatorsQuery.error?.message}
                      onRetry={() => operatorsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : operators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No operators found"
                      description="No bus operators matched your filter criteria."
                      actionLabel="Onboard Operator"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                operators.map((op) => (
                  <tr
                    key={op.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Bus className="h-4 w-4 text-amber-500 shrink-0" />
                      <Link
                        href={`/operators/${op.id}`}
                        className="hover:text-amber-500 transition-colors"
                      >
                        {op.name}
                      </Link>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {op.code}
                    </td>

                    <td className="p-3.5">
                      <p className="text-slate-800 dark:text-slate-200">{op.contactEmail}</p>
                      <p className="text-[11px] text-slate-400">{op.contactPhone}</p>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {op.city ? `${op.city}${op.state ? `, ${op.state}` : ''}` : '—'}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {op.commissionPct}%
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(op.status)} size="sm">
                        {op.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/operators/${op.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => openEditModal(op)}
                          title="Edit operator"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {op.status === 'ACTIVE' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-600"
                            title="Suspend operator"
                            onClick={() => setSuspendOperator(op)}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-emerald-600"
                            title="Activate operator"
                            onClick={() => setActivateOperator(op)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
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

      {/* Onboard / Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingOperator ? `Edit Operator: ${editingOperator.name}` : 'Onboard New Bus Operator'}
        description="Register operator legal details, commission split percentage, and tax IDs."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Operator Name (Required)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VRL Travels"
            />
            <Input
              label="Operator Code (Unique, e.g. VRL)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. VRL"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="support@vrlbus.in"
            />
            <Input
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Commission %"
              type="number"
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value))}
            />
            <Input
              label="GST Number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="29AAAAA0000A1Z5"
            />
            <Input
              label="PAN Number"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              placeholder="ABCDE1234F"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bangalore"
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Karnataka"
            />
          </div>

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
              {editingOperator ? 'Update Operator' : 'Complete Onboarding'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      {suspendOperator && (
        <ConfirmationDialog
          open={!!suspendOperator}
          onOpenChange={(open) => !open && setSuspendOperator(null)}
          title={`Suspend Operator: ${suspendOperator.name}`}
          description="Are you sure you want to suspend this bus operator? Their scheduled bus services will be hidden from customer search."
          confirmLabel="Suspend Operator"
          variant="destructive"
          isLoading={suspendMutation.isPending}
          onConfirm={() =>
            suspendMutation.mutate({
              id: suspendOperator.id,
              reason: suspendReason,
            })
          }
        >
          <Input
            label="Suspension Reason (Required)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
        </ConfirmationDialog>
      )}

      {/* Activate Confirmation Dialog */}
      {activateOperator && (
        <ConfirmationDialog
          open={!!activateOperator}
          onOpenChange={(open) => !open && setActivateOperator(null)}
          title={`Activate Operator: ${activateOperator.name}`}
          description="Restore full booking and inventory synchronization for this operator."
          confirmLabel="Activate Operator"
          variant="primary"
          isLoading={activateMutation.isPending}
          onConfirm={() => activateMutation.mutate(activateOperator.id)}
        />
      )}
    </div>
  );
}
