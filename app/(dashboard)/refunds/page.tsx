'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  RotateCcw,
  Undo2,
  CheckCircle,
  Play,
  ExternalLink,
} from 'lucide-react';
import type { RefundListItem, RefundStatsData, PaginationMeta } from '@/types/api';

export default function RefundsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Process Modal
  const [processModalRefund, setProcessModalRefund] = useState<RefundListItem | null>(null);
  const [processNotes, setProcessNotes] = useState('Manual bank transfer verified by finance');

  // Retry Modal
  const [retryModalRefund, setRetryModalRefund] = useState<RefundListItem | null>(null);

  // Fetch Stats
  const statsQuery = useQuery({
    queryKey: ['admin', 'refunds', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<RefundStatsData>('/admin/refunds/stats');
      return res.data;
    },
  });

  // Fetch Refunds List
  const refundsQuery = useQuery({
    queryKey: ['admin', 'refunds', 'list', { page, limit, status, destination, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<RefundListItem[]>('/admin/refunds', {
        page,
        limit,
        status: status || undefined,
        destination: destination || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Process Refund Mutation
  const processMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return apiClient.post(`/admin/refunds/${id}/process`, { notes });
    },
    onSuccess: () => {
      toast.success('Refund processed successfully');
      setProcessModalRefund(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to process refund');
    },
  });

  // Retry Refund Mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/refunds/${id}/retry`);
    },
    onSuccess: () => {
      toast.success('Refund job queued for retry');
      setRetryModalRefund(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to retry refund');
    },
  });

  const stats = statsQuery.data;
  const pendingRefundsCount =
    stats?.pendingRefunds ?? stats?.byStatus?.['PENDING']?.count ?? 0;
  const completedRefundsCount =
    stats?.completedRefunds ?? stats?.byStatus?.['COMPLETED']?.count ?? 0;
  const failedRefundsCount =
    stats?.failedRefunds ?? stats?.byStatus?.['FAILED']?.count ?? 0;
  const totalRefundedAmount = stats?.totalRefundedAmount ?? 0;
  const totalRefundsCount = stats?.totalRefunds ?? 0;

  const refunds = refundsQuery.data?.items || [];
  const pagination = refundsQuery.data?.pagination || {
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
        title="Refund Processing"
        description="Oversee cancellation refund lifecycles, execute manual completions, and re-dispatch failed gateway transactions."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => {
              refundsQuery.refetch();
              statsQuery.refetch();
            }}
            isLoading={refundsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Action</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {pendingRefundsCount.toLocaleString()}
          </p>
          <p className="text-xs text-amber-600/70 mt-0.5">Awaiting gateway processing</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {completedRefundsCount.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-600/70 mt-0.5">Settled to customer</p>
        </Card>

        <Card className="p-4 border-rose-500/20 bg-rose-500/5">
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Failed Dispatches</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {failedRefundsCount.toLocaleString()}
          </p>
          <p className="text-xs text-rose-600/70 mt-0.5">Requires retry or intervention</p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Refunded</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalRefundedAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{totalRefundsCount.toLocaleString()} total requests</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="REVERSED">REVERSED</option>
          </Select>

          <Select
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Destinations</option>
            <option value="ORIGINAL_PAYMENT_METHOD">ORIGINAL_PAYMENT_METHOD</option>
            <option value="WALLET">WALLET</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="amount">Sort: Amount</option>
            <option value="status">Sort: Status</option>
          </Select>

          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="desc">Order: Descending</option>
            <option value="asc">Order: Ascending</option>
          </Select>
        </div>
      </Card>

      {/* Refunds Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Refund ID</th>
                <th className="p-3.5">Booking No</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Initiated</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {refundsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : refundsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load refunds"
                      message={refundsQuery.error?.message}
                      onRetry={() => refundsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No refund records found"
                      description="No refunds matched the selected criteria."
                    />
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {r.id.slice(0, 8)}…
                    </td>

                    <td className="p-3.5">
                      <Link
                        href={`/bookings/${r.bookingId}`}
                        className="font-mono text-amber-500 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {r.booking?.bookingNumber || r.bookingId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
                      </Link>
                      {r.booking?.contactName && (
                        <p className="text-[10px] text-slate-400">{r.booking.contactName}</p>
                      )}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {r.destination}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(r.amount)}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(r.status)} size="sm">
                        {r.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(r.createdAt)}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === 'PENDING' && (
                          <Button
                            variant="gold"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setProcessModalRefund(r)}
                          >
                            Process
                          </Button>
                        )}

                        {r.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-rose-500 hover:text-rose-600"
                            onClick={() => setRetryModalRefund(r)}
                          >
                            Retry
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

      {/* Process Refund Modal */}
      {processModalRefund && (
        <Dialog
          open={!!processModalRefund}
          onOpenChange={(open) => !open && setProcessModalRefund(null)}
          title={`Process Refund: ${formatCurrency(processModalRefund.amount)}`}
          description="Mark this refund as manually executed and update associated booking to REFUNDED."
        >
          <div className="space-y-4">
            <Input
              label="Settlement Notes / Bank UTR"
              value={processNotes}
              onChange={(e) => setProcessNotes(e.target.value)}
              placeholder="e.g. Bank IMPS Reference #123456789"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setProcessModalRefund(null)}>
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                isLoading={processMutation.isPending}
                onClick={() =>
                  processMutation.mutate({
                    id: processModalRefund.id,
                    notes: processNotes,
                  })
                }
              >
                Confirm Settlement
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Retry Refund Confirmation Dialog */}
      {retryModalRefund && (
        <ConfirmationDialog
          open={!!retryModalRefund}
          onOpenChange={(open) => !open && setRetryModalRefund(null)}
          title={`Retry Refund: ${formatCurrency(retryModalRefund.amount)}`}
          description="Re-queue this failed refund dispatch into the background payment gateway worker."
          confirmLabel="Enqueue Retry"
          variant="primary"
          isLoading={retryMutation.isPending}
          onConfirm={() => retryMutation.mutate(retryModalRefund.id)}
        />
      )}
    </div>
  );
}
