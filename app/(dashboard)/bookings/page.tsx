'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  Search,
  RotateCcw,
  Eye,
  XCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  DollarSign,
  Ticket,
} from 'lucide-react';
import type { BookingListItem, BookingStatsData, BookingStatus, PaginationMeta } from '@/types/api';

export default function BookingsListPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [operatorName, setOperatorName] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalFare' | 'journeyDate' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested administrative cancellation');
  const [cancelInitiateRefund, setCancelInitiateRefund] = useState(true);

  const [overrideModalBooking, setOverrideModalBooking] = useState<BookingListItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<BookingStatus>('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState('Manual verification completed by administrator');

  // Fetch Stats
  const statsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get<BookingStatsData>('/admin/bookings/stats');
      return res.data;
    },
  });

  // Fetch Bookings List
  const bookingsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'list', { page, limit, search, status, operatorName, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<BookingListItem[]>('/admin/bookings', {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        operatorName: operatorName || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason, initiateRefund }: { id: string; reason: string; initiateRefund: boolean }) => {
      return apiClient.post(`/admin/bookings/${id}/cancel`, { reason, initiateRefund });
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      setCancelModalBooking(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel booking');
    },
  });

  // Override Status Mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason: string }) => {
      return apiClient.patch(`/admin/bookings/${id}/status`, { status, reason });
    },
    onSuccess: () => {
      toast.success('Booking status updated successfully');
      setOverrideModalBooking(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to override booking status');
    },
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/bookings/${id}/reconcile`);
    },
    onSuccess: () => {
      toast.success('Reconciliation job triggered');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Reconciliation failed');
    },
  });

  const stats = statsQuery.data;

  // Calculate counts safely whether backend returns statusDistribution or flat fields
  const totalCount =
    stats?.totalBookings ??
    stats?.statusDistribution?.reduce((acc, curr) => acc + (curr.count || 0), 0) ??
    0;

  const confirmedCount =
    stats?.confirmedBookings ??
    stats?.statusDistribution?.find((s) => s.status === 'CONFIRMED')?.count ??
    0;

  const pendingCount =
    stats?.pendingBookings ??
    stats?.statusDistribution?.filter((s) =>
      ['PAYMENT_PENDING', 'INITIATED', 'HOLD_REQUESTED', 'CONFIRMATION_PENDING'].includes(s.status)
    )?.reduce((acc, curr) => acc + (curr.count || 0), 0) ??
    0;

  const cancelledCount =
    stats?.cancelledBookings ??
    stats?.statusDistribution?.find((s) => s.status === 'CANCELLED')?.count ??
    0;

  const totalRevenueAmount =
    stats?.totalRevenue ??
    stats?.totalConfirmedRevenue ??
    0;

  const averageFareAmount =
    stats?.averageFare ??
    (confirmedCount > 0 ? totalRevenueAmount / confirmedCount : 0);

  const bookings = bookingsQuery.data?.items || [];
  const pagination = bookingsQuery.data?.pagination || {
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
        title="Booking Management"
        description="Inspect passenger reservations, override lifecycle states, and perform administrative cancellations."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => {
              bookingsQuery.refetch();
              statsQuery.refetch();
            }}
            isLoading={bookingsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Bookings</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {totalCount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Confirmed</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {confirmedCount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3 border-amber-500/20 bg-amber-500/5">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {pendingCount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3 border-rose-500/20 bg-rose-500/5">
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Cancelled</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {cancelledCount.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Average Fare</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(averageFareAmount)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalRevenueAmount)}
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search booking number, name, phone, PNR..."
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
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="HELD">HELD</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="FAILED">FAILED</option>
          </Select>

          <Input
            placeholder="Filter by operator..."
            value={operatorName}
            onChange={(e) => {
              setOperatorName(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="journeyDate">Sort: Journey Date</option>
            <option value="totalFare">Sort: Total Fare</option>
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

      {/* Bookings Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Booking No</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Route</th>
                <th className="p-3.5">Operator & Bus</th>
                <th className="p-3.5">Journey Date</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {bookingsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
              ) : bookingsQuery.isError ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <ErrorState
                      title="Failed to load bookings"
                      message={bookingsQuery.error?.message}
                      onRetry={() => bookingsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="No bookings found"
                      description="No booking records matched your search parameters or filter criteria."
                      actionLabel="Clear Filters"
                      onAction={() => {
                        setSearch('');
                        setStatus('');
                        setOperatorName('');
                        setPage(1);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {booking.bookingNumber}
                      </Link>
                      {booking.providerPnrNo && (
                        <p className="text-[10px] text-slate-400 font-sans">
                          PNR: {booking.providerPnrNo}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {booking.contactName}
                      </p>
                      <p className="text-[11px] text-slate-400">{booking.contactPhone}</p>
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {booking.fromCityName} → {booking.toCityName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {booking._count?.seats || 1} seat(s)
                      </p>
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {booking.operatorName}
                      </p>
                      {booking.busType && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {booking.busType}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {formatDateTime(booking.journeyDate, false)}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(booking.totalFare)}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                        {booking.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/bookings/${booking.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        {/* Status override button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-500 hover:text-amber-600"
                          title="Override status"
                          onClick={() => {
                            setOverrideModalBooking(booking);
                            setOverrideStatus(booking.status);
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>

                        {/* Cancel button if not cancelled */}
                        {booking.status !== 'CANCELLED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-600"
                            title="Cancel booking"
                            onClick={() => setCancelModalBooking(booking)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
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

      {/* Admin Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <ConfirmationDialog
          open={!!cancelModalBooking}
          onOpenChange={(open) => !open && setCancelModalBooking(null)}
          title={`Cancel Booking: ${cancelModalBooking.bookingNumber}`}
          description={`Are you sure you want to cancel this booking for ${cancelModalBooking.contactName}? This will trigger seat release on the inventory provider.`}
          confirmLabel="Cancel Booking"
          variant="destructive"
          isLoading={cancelMutation.isPending}
          onConfirm={() =>
            cancelMutation.mutate({
              id: cancelModalBooking.id,
              reason: cancelReason,
              initiateRefund: cancelInitiateRefund,
            })
          }
        >
          <div className="space-y-3 pt-2">
            <Input
              label="Cancellation Reason (Required)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Minimum 5 characters..."
            />
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelInitiateRefund}
                onChange={(e) => setCancelInitiateRefund(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>Initiate automated refund lifecycle for original transaction</span>
            </label>
          </div>
        </ConfirmationDialog>
      )}

      {/* Admin Status Override Modal */}
      {overrideModalBooking && (
        <Dialog
          open={!!overrideModalBooking}
          onOpenChange={(open) => !open && setOverrideModalBooking(null)}
          title={`Override Status: ${overrideModalBooking.bookingNumber}`}
          description="Force a state machine transition. Must include an administrative audit reason."
        >
          <div className="space-y-4">
            <Select
              label="Target Status"
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value as any)}
            >
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="RECONCILED">RECONCILED</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">PENDING</option>
            </Select>

            <Input
              label="Override Audit Reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Manual payment verified via gateway portal"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrideModalBooking(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                isLoading={overrideMutation.isPending}
                onClick={() =>
                  overrideMutation.mutate({
                    id: overrideModalBooking.id,
                    status: overrideStatus,
                    reason: overrideReason,
                  })
                }
              >
                Apply Override
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
