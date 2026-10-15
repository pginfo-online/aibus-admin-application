'use client';

import React from 'react';
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
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  CreditCard,
  ArrowLeft,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { PaymentListItem } from '@/types/api';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const paymentId = params.id as string;

  const paymentQuery = useQuery({
    queryKey: ['admin', 'payments', 'detail', paymentId],
    queryFn: async () => {
      const res = await apiClient.get<PaymentListItem>(`/admin/payments/${paymentId}`);
      return res.data;
    },
    enabled: !!paymentId,
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/payments/${paymentId}/reconcile`);
    },
    onSuccess: () => {
      toast.success('Payment reconciliation verified');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Reconciliation failed');
    },
  });

  const p = paymentQuery.data;

  if (paymentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (paymentQuery.isError || !p) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/payments')}
        >
          Back to Payments
        </Button>
        <ErrorState
          title="Payment Not Found"
          message={paymentQuery.error?.message || 'Could not locate payment transaction.'}
          onRetry={() => paymentQuery.refetch()}
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
          onClick={() => router.push('/payments')}
        >
          Payments
        </Button>
      </div>

      <PageHeader
        title={`Payment Transaction #${p.id.slice(0, 8)}…`}
        description={`Gateway: ${p.gateway} • Recorded on ${formatDateTime(p.createdAt)}`}
        badge={
          <Badge variant={getStatusBadgeVariant(p.status)} size="md">
            {p.status}
          </Badge>
        }
        actions={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            isLoading={reconcileMutation.isPending}
            onClick={() => reconcileMutation.mutate()}
          >
            Reconcile Gateway
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" /> Transaction Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{p.id}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Gateway Provider</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{p.gateway}</span>
            </div>

            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Gateway Reference No</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                {p.gatewayTransactionId || 'None'}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Payment Amount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(p.amount, p.currency)}
              </span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Payment Method</span>
              <span className="capitalize text-slate-900 dark:text-slate-100">
                {p.paymentMethod || 'Online Gateway'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Associated Booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="text-slate-500">Booking ID</p>
              <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">{p.bookingId}</p>
            </div>

            <div className="pt-2">
              <Link href={`/bookings/${p.bookingId}`}>
                <Button variant="outline" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                  Inspect Booking
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
