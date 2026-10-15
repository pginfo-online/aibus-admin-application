'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Ticket,
  User,
  CreditCard,
  Undo2,
  Bus,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  RotateCcw,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import type { BookingDetailsData, BookingStatus } from '@/types/api';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params.id as string;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested administrative cancellation');
  const [initiateRefund, setInitiateRefund] = useState(true);

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<BookingStatus>('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState('Administrative verification');

  // Fetch Booking Details
  const bookingQuery = useQuery({
    queryKey: ['admin', 'bookings', 'detail', bookingId],
    queryFn: async () => {
      const res = await apiClient.get<BookingDetailsData>(`/admin/bookings/${bookingId}`);
      return res.data;
    },
    enabled: !!bookingId,
  });

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/bookings/${bookingId}/cancel`, {
        reason: cancelReason,
        initiateRefund,
      });
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      setCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel booking');
    },
  });

  // Status Override Mutation
  const overrideMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/admin/bookings/${bookingId}/status`, {
        status: overrideStatus,
        reason: overrideReason,
      });
    },
    onSuccess: () => {
      toast.success('Status updated successfully');
      setOverrideModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to override status');
    },
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/bookings/${bookingId}/reconcile`);
    },
    onSuccess: () => {
      toast.success('Reconciliation completed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Reconciliation failed');
    },
  });

  const b = bookingQuery.data;

  if (bookingQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (bookingQuery.isError || !b) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/bookings')}
        >
          Back to Bookings
        </Button>
        <ErrorState
          title="Booking Not Found"
          message={bookingQuery.error?.message || 'Could not locate the requested booking record.'}
          onRetry={() => bookingQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/bookings')}
        >
          Bookings
        </Button>
      </div>

      <PageHeader
        title={`Booking #${b.bookingNumber}`}
        description={`Registered on ${formatDateTime(b.createdAt)}`}
        badge={
          <Badge variant={getStatusBadgeVariant(b.status)} size="md">
            {b.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              isLoading={reconcileMutation.isPending}
              onClick={() => reconcileMutation.mutate()}
            >
              Reconcile
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle className="h-3.5 w-3.5 text-amber-500" />}
              onClick={() => {
                setOverrideStatus(b.status);
                setOverrideModalOpen(true);
              }}
            >
              Override Status
            </Button>

            {b.status !== 'CANCELLED' && (
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel Booking
              </Button>
            )}
          </div>
        }
      />

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Journey, Seats, Passengers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Journey Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bus className="h-4 w-4 text-amber-500" /> Journey Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Route</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {b.fromCityName} → {b.toCityName}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">Journey Date</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatDateTime(b.journeyDate, false)}
                </p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">Operator</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {b.operatorName}
                </p>
                {b.busType && <p className="text-slate-400 text-[11px]">{b.busType}</p>}
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400">GDS / PNR Reference</p>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                  {b.providerPnrNo || b.providerTicketNo || 'Pending Provider'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Passenger & Seat Layout */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-500" /> Seats & Passenger Manifest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                      <th className="pb-2">Seat</th>
                      <th className="pb-2">Passenger Name</th>
                      <th className="pb-2">Age / Gender</th>
                      <th className="pb-2 text-right">Fare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {b.passengers?.map((p, idx) => {
                      const seat = b.seats?.find((s) => s.seatNumber === p.seatNumber);
                      return (
                        <tr key={p.id || idx}>
                          <td className="py-2.5 font-bold font-mono text-amber-600 dark:text-amber-400">
                            {p.seatNumber}
                          </td>
                          <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {p.name}
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-400 capitalize">
                            {p.age} yrs • {p.gender.toLowerCase()}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(seat?.fare || b.totalFare / (b.passengers.length || 1))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payments & Refunds */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" /> Payment & Refund History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {b.payments && b.payments.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {b.payments.map((pmt) => (
                    <div key={pmt.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {pmt.gateway}
                          </span>
                          <Badge variant={getStatusBadgeVariant(pmt.status)} size="sm">
                            {pmt.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Txn: {pmt.gatewayTransactionId || pmt.id} • {formatDateTime(pmt.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(pmt.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No payment transaction records.</p>
              )}

              {b.refunds && b.refunds.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Refunds
                  </h4>
                  <div className="space-y-2">
                    {b.refunds.map((ref) => (
                      <div key={ref.id} className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/40 flex items-center justify-between text-xs">
                        <div>
                          <Badge variant={getStatusBadgeVariant(ref.status)} size="sm">
                            {ref.status}
                          </Badge>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Destination: {ref.destination} • {formatDateTime(ref.createdAt)}
                          </p>
                        </div>
                        <div className="text-right font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(ref.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Contact, User, Financial Summary */}
        <div className="space-y-6">
          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fare Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Fare</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(b.totalFare)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-sm font-bold">
                <span>Final Paid</span>
                <span className="text-amber-500">{formatCurrency(b.totalFare)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" /> Contact Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-slate-500">Contact Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{b.contactName}</p>
              </div>
              <div>
                <p className="text-slate-500">Phone Number</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{b.contactPhone}</p>
              </div>
              <div>
                <p className="text-slate-500">Email Address</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{b.contactEmail}</p>
              </div>
              {b.user && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/users/${b.user.id}`}
                    className="text-amber-500 hover:underline font-semibold flex items-center gap-1"
                  >
                    View Registered Account <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* E-Ticket PDF Link if generated */}
          {b.ticket && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" /> Issued Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="font-mono text-slate-900 dark:text-slate-100">
                  Ticket #: {b.ticket.ticketNumber}
                </p>
                <Badge variant="success" size="sm">
                  {b.ticket.status}
                </Badge>
                {b.ticket.pdfUrl && (
                  <div className="pt-2">
                    <a
                      href={b.ticket.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-500 hover:underline font-semibold"
                    >
                      Download PDF Ticket ↗
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Booking Dialog */}
      <ConfirmationDialog
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        title={`Cancel Booking #${b.bookingNumber}`}
        description="Are you sure you want to administratively cancel this reservation? This releases locked seats."
        confirmLabel="Confirm Cancellation"
        variant="destructive"
        isLoading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      >
        <div className="space-y-3 pt-2">
          <Input
            label="Cancellation Reason (Required)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={initiateRefund}
              onChange={(e) => setInitiateRefund(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span>Initiate automated refund pipeline</span>
          </label>
        </div>
      </ConfirmationDialog>

      {/* Override Status Dialog */}
      <Dialog
        open={overrideModalOpen}
        onOpenChange={setOverrideModalOpen}
        title="Admin Status Override"
        description="Force this booking into a different state machine lifecycle."
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
            label="Audit Reason"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={overrideMutation.isPending}
              onClick={() => overrideMutation.mutate()}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
