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
import Link from 'next/link';
import {
  Bus,
  ArrowLeft,
  Mail,
  Phone,
  Ticket,
  MapPin,
  Building,
} from 'lucide-react';
import type { OperatorListItem, BookingListItem } from '@/types/api';

export default function OperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = params.id as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>('profile');

  // Fetch Operator Details
  const operatorQuery = useQuery({
    queryKey: ['admin', 'operators', 'detail', operatorId],
    queryFn: async () => {
      const res = await apiClient.get<OperatorListItem>(`/admin/operators/${operatorId}`);
      return res.data;
    },
    enabled: !!operatorId,
  });

  // Fetch Operator Bookings
  const bookingsQuery = useQuery({
    queryKey: ['admin', 'operators', operatorId, 'bookings'],
    queryFn: async () => {
      const res = await apiClient.get<BookingListItem[]>(`/admin/operators/${operatorId}/bookings`);
      return res.data || [];
    },
    enabled: activeTab === 'bookings',
  });

  const op = operatorQuery.data;

  if (operatorQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (operatorQuery.isError || !op) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/operators')}
        >
          Back to Operators
        </Button>
        <ErrorState
          title="Operator Not Found"
          message={operatorQuery.error?.message || 'Could not locate the operator record.'}
          onRetry={() => operatorQuery.refetch()}
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
          onClick={() => router.push('/operators')}
        >
          Operators
        </Button>
      </div>

      <PageHeader
        title={op.name}
        description={`Operator Code: ${op.code} • Registered on ${formatDateTime(op.createdAt)}`}
        badge={
          <Badge variant={getStatusBadgeVariant(op.status)} size="md">
            {op.status}
          </Badge>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors ${
            activeTab === 'profile'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Operator Profile & Tax
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors ${
            activeTab === 'bookings'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Operated Bookings
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bus className="h-4 w-4 text-amber-500" /> Commercial & Operational Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Legal Company Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{op.name}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Fleet Code</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{op.code}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Commission Rate</span>
                <span className="font-bold text-amber-500">{op.commissionPct}%</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Contact Email</span>
                <span className="text-slate-900 dark:text-slate-100">{op.contactEmail}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Contact Phone</span>
                <span className="text-slate-900 dark:text-slate-100">{op.contactPhone}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-500" /> Tax & GDS Inventory Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">GST Registration Number</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{op.gstNumber || 'Not provided'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">PAN Number</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{op.panNumber || 'Not provided'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Inventory Provider</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{op.providerName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Headquarters Location</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {op.city ? `${op.city}${op.state ? `, ${op.state}` : ''}` : 'Not provided'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'bookings' && (
        <Card>
          <CardContent className="p-4">
            {bookingsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (bookingsQuery.data?.length || 0) === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No bookings recorded for this operator yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {bookingsQuery.data?.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bookings/${b.id}`}
                          className="font-mono font-semibold text-amber-500 hover:underline"
                        >
                          {b.bookingNumber}
                        </Link>
                        <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {b.fromCityName} → {b.toCityName} • {b.contactName} ({b.contactPhone})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(b.totalFare)}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Journey: {formatDateTime(b.journeyDate, false)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
