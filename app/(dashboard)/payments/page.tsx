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
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Search,
  RotateCcw,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { PaymentListItem, PaymentStatsData, PaginationMeta } from '@/types/api';

export default function PaymentsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [gateway, setGateway] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Stats Query
  const statsQuery = useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<PaymentStatsData>('/admin/payments/stats');
      return res.data;
    },
  });

  // Payments List Query
  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments', 'list', { page, limit, search, status, gateway, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<PaymentListItem[]>('/admin/payments', {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        gateway: gateway || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/payments/${id}/reconcile`);
    },
    onSuccess: () => {
      toast.success('Payment reconciliation completed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Payment reconciliation failed');
    },
  });

  const stats = statsQuery.data;
  const payments = paymentsQuery.data?.items || [];
  const pagination = paymentsQuery.data?.pagination || {
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
        title="Payment Operations"
        description="Monitor gateway settlements, verify transactions, and trigger manual reconciliations."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => {
              paymentsQuery.refetch();
              statsQuery.refetch();
            }}
            isLoading={paymentsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI Volume Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Volume</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(stats?.totalVolume)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{stats?.totalPayments || 0} transactions</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Success Volume</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {formatCurrency(stats?.successVolume)}
          </p>
          <p className="text-xs text-emerald-600/70 mt-0.5">{stats?.successCount || 0} successful</p>
        </Card>

        <Card className="p-4 border-rose-500/20 bg-rose-500/5">
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Failed Attempts</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {stats?.failedCount || 0}
          </p>
          <p className="text-xs text-rose-600/70 mt-0.5">Gateway rejections</p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Success Rate</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {stats?.totalPayments
              ? `${(((stats.successCount || 0) / stats.totalPayments) * 100).toFixed(1)}%`
              : '100%'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Platform settlement</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search gateway transaction ID, booking..."
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
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </Select>

          <Select
            value={gateway}
            onChange={(e) => {
              setGateway(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Gateways</option>
            <option value="PHONEPE">PHONEPE</option>
            <option value="RAZORPAY">RAZORPAY</option>
            <option value="WALLET">WALLET</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Date</option>
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

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Payment ID</th>
                <th className="p-3.5">Gateway & Method</th>
                <th className="p-3.5">Gateway Txn Reference</th>
                <th className="p-3.5">Booking Reference</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paymentsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
              ) : paymentsQuery.isError ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <ErrorState
                      title="Failed to load payments"
                      message={paymentsQuery.error?.message}
                      onRetry={() => paymentsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="No payment records found"
                      description="No payments matched the current filters."
                      actionLabel="Reset Search"
                      onAction={() => {
                        setSearch('');
                        setStatus('');
                        setGateway('');
                        setPage(1);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      <Link
                        href={`/payments/${p.id}`}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                      >
                        {p.id.slice(0, 8)}…
                      </Link>
                    </td>

                    <td className="p-3.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {p.gateway}
                      </span>
                      {p.paymentMethod && (
                        <p className="text-[10px] text-slate-400 capitalize">{p.paymentMethod}</p>
                      )}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {p.gatewayTransactionId || '—'}
                    </td>

                    <td className="p-3.5">
                      {p.booking?.bookingNumber ? (
                        <Link
                          href={`/bookings/${p.bookingId}`}
                          className="font-mono text-amber-500 hover:underline flex items-center gap-1"
                        >
                          {p.booking.bookingNumber} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">{p.bookingId.slice(0, 8)}…</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(p.status)} size="sm">
                        {p.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(p.createdAt)}
                    </td>

                    <td className="p-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-amber-500 hover:text-amber-600"
                        isLoading={reconcileMutation.isPending && reconcileMutation.variables === p.id}
                        onClick={() => reconcileMutation.mutate(p.id)}
                      >
                        Reconcile
                      </Button>
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
    </div>
  );
}
