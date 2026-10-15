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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Ticket,
  CreditCard,
  UserX,
  UserCheck,
  Save,
} from 'lucide-react';
import type { UserDetailsData, BookingListItem, PaymentListItem, WalletTransactionItem, UserRole, UserStatus } from '@/types/api';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'payments' | 'wallet'>('profile');

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [formInitialized, setFormInitialized] = useState(false);

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Violation of platform policy');

  // Fetch User Details
  const userQuery = useQuery({
    queryKey: ['admin', 'users', 'detail', userId],
    queryFn: async () => {
      const res = await apiClient.get<UserDetailsData>(`/admin/users/${userId}`);
      if (!formInitialized && res.data) {
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');
        setPhone(res.data.phone || '');
        setRole(res.data.role);
        setStatus(res.data.status);
        setFormInitialized(true);
      }
      return res.data;
    },
    enabled: !!userId,
  });

  // Fetch User Bookings
  const bookingsQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'bookings'],
    queryFn: async () => {
      const res = await apiClient.get<BookingListItem[]>(`/admin/users/${userId}/bookings`);
      return res.data || [];
    },
    enabled: activeTab === 'bookings',
  });

  // Fetch User Payments
  const paymentsQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'payments'],
    queryFn: async () => {
      const res = await apiClient.get<PaymentListItem[]>(`/admin/users/${userId}/payments`);
      return res.data || [];
    },
    enabled: activeTab === 'payments',
  });

  // Fetch User Wallet Transactions
  const walletQuery = useQuery({
    queryKey: ['admin', 'users', userId, 'wallet'],
    queryFn: async () => {
      const res = await apiClient.get<WalletTransactionItem[]>(`/admin/users/${userId}/wallet`);
      return res.data || [];
    },
    enabled: activeTab === 'wallet',
  });

  // Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/admin/users/${userId}`, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        role,
        status,
      });
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user profile');
    },
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/users/${userId}/suspend`, { reason: suspendReason });
    },
    onSuccess: () => {
      toast.success('User suspended successfully');
      setSuspendModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suspend user');
    },
  });

  // Activate Mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/users/${userId}/activate`);
    },
    onSuccess: () => {
      toast.success('User activated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to activate user');
    },
  });

  const u = userQuery.data;

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (userQuery.isError || !u) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/users')}
        >
          Back to Users
        </Button>
        <ErrorState
          title="User Not Found"
          message={userQuery.error?.message || 'Could not locate the requested user account.'}
          onRetry={() => userQuery.refetch()}
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
          onClick={() => router.push('/users')}
        >
          Users
        </Button>
      </div>

      <PageHeader
        title={u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
        description={`User ID: ${u.id} • Registered ${formatDateTime(u.createdAt)}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={['ADMIN', 'SUPER_ADMIN'].includes(u.role) ? 'gold' : 'neutral'} size="md">
              {u.role}
            </Badge>
            <Badge variant={getStatusBadgeVariant(u.status)} size="md">
              {u.status}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {u.status === 'ACTIVE' ? (
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<UserX className="h-3.5 w-3.5" />}
                disabled={u.role === 'SUPER_ADMIN'}
                onClick={() => setSuspendModalOpen(true)}
              >
                Suspend User
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserCheck className="h-3.5 w-3.5 text-emerald-500" />}
                isLoading={activateMutation.isPending}
                onClick={() => activateMutation.mutate()}
              >
                Activate User
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'profile'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Profile & Permissions
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'bookings'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Bookings History
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'payments'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Payments History
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'wallet'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Wallet Balance ({formatCurrency(u.walletBalance || 0)})
        </button>
      </div>

      {/* Tab: Profile & Permissions */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Account Details & RBAC Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address (Authoritative)"
                  value={u.email}
                  disabled
                  helperText="Email changes require identity verification"
                />
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Select
                  label="RBAC Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="OPERATOR_AGENT">OPERATOR_AGENT</option>
                  <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </Select>

                <Select
                  label="Account Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                </Select>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  variant="gold"
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  isLoading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate()}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Wallet Balance</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(u.walletBalance || 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Bookings</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {u._count?.bookings || 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Bookings History */}
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
                No past bookings found for this customer.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {bookingsQuery.data?.map((booking) => (
                  <div key={booking.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="font-mono font-semibold text-amber-500 hover:underline"
                        >
                          {booking.bookingNumber}
                        </Link>
                        <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {booking.fromCityName} → {booking.toCityName} • {booking.operatorName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(booking.totalFare)}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {formatDateTime(booking.createdAt, false)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Payments History */}
      {activeTab === 'payments' && (
        <Card>
          <CardContent className="p-4">
            {paymentsQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (paymentsQuery.data?.length || 0) === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No payment transactions recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paymentsQuery.data?.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.gateway}
                        </span>
                        <Badge variant={getStatusBadgeVariant(p.status)} size="sm">
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Txn ID: {p.gatewayTransactionId || p.id}
                      </p>
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Wallet History */}
      {activeTab === 'wallet' && (
        <Card>
          <CardContent className="p-4">
            {walletQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (walletQuery.data?.length || 0) === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No wallet transactions recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {walletQuery.data?.map((w) => (
                  <div key={w.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {w.type}
                      </span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Balance After: {formatCurrency(w.balanceAfter)} • {formatDateTime(w.createdAt)}
                      </p>
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(w.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        title={`Suspend Account: ${u.email}`}
        description="Are you sure you want to suspend this account? The user will immediately be barred from signing in."
        confirmLabel="Suspend User"
        variant="destructive"
        isLoading={suspendMutation.isPending}
        onConfirm={() => suspendMutation.mutate()}
      >
        <Input
          label="Suspension Audit Reason (Required)"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
        />
      </ConfirmationDialog>
    </div>
  );
}
