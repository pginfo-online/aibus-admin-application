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
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Search,
  RotateCcw,
  Eye,
  UserX,
  UserCheck,
  Shield,
  Users,
} from 'lucide-react';
import type { UserListItem, PaginationMeta } from '@/types/api';

export default function UsersListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'email' | 'role' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Suspension modal
  const [suspendUser, setSuspendUser] = useState<UserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('Violation of platform terms of service');

  // Activation modal
  const [activateUser, setActivateUser] = useState<UserListItem | null>(null);

  // Fetch Users
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'list', { page, limit, search, role, status, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<UserListItem[]>('/admin/users', {
        page,
        limit,
        search: search || undefined,
        role: role || undefined,
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

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.post(`/admin/users/${id}/suspend`, { reason });
    },
    onSuccess: () => {
      toast.success('User suspended successfully');
      setSuspendUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suspend user');
    },
  });

  // Activate Mutation
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/users/${id}/activate`);
    },
    onSuccess: () => {
      toast.success('User activated successfully');
      setActivateUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to activate user');
    },
  });

  const users = usersQuery.data?.items || [];
  const pagination = usersQuery.data?.pagination || {
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
        title="User Management"
        description="Search customer and staff accounts, oversee RBAC roles, and regulate account access."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => usersQuery.refetch()}
            isLoading={usersQuery.isFetching}
          >
            Refresh
          </Button>
        }
      />

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search by name, email, phone..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="OPERATOR_AGENT">OPERATOR_AGENT</option>
            <option value="SUPPORT_AGENT">SUPPORT_AGENT</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </Select>

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
            <option value="DEACTIVATED">DEACTIVATED</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="email">Sort: Email</option>
            <option value="role">Sort: Role</option>
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

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">User</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Bookings</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {usersQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : usersQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load users"
                      message={usersQuery.error?.message}
                      onRetry={() => usersQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No users found"
                      description="No user records matched your criteria."
                      actionLabel="Clear Filters"
                      onAction={() => {
                        setSearch('');
                        setRole('');
                        setStatus('');
                        setPage(1);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
                          {u.firstName?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/users/${u.id}`}
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-500 transition-colors"
                          >
                            {u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-mono">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{u.email}</p>
                      {u.phone && <p className="text-[11px] text-slate-400">{u.phone}</p>}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant={['ADMIN', 'SUPER_ADMIN'].includes(u.role) ? 'gold' : 'neutral'}
                        size="sm"
                      >
                        {u.role}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(u.status)} size="sm">
                        {u.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
                      {u._count?.bookings || 0}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(u.createdAt, false)}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/users/${u.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View user details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        {u.status === 'ACTIVE' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-600"
                            title="Suspend user"
                            disabled={u.role === 'SUPER_ADMIN'}
                            onClick={() => setSuspendUser(u)}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-emerald-600"
                            title="Activate user"
                            onClick={() => setActivateUser(u)}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
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

      {/* Suspend Confirmation Dialog */}
      {suspendUser && (
        <ConfirmationDialog
          open={!!suspendUser}
          onOpenChange={(open) => !open && setSuspendUser(null)}
          title={`Suspend Account: ${suspendUser.email}`}
          description={`Are you sure you want to suspend this user? This immediately invalidates active sessions and revokes login access.`}
          confirmLabel="Suspend User"
          variant="destructive"
          isLoading={suspendMutation.isPending}
          onConfirm={() =>
            suspendMutation.mutate({
              id: suspendUser.id,
              reason: suspendReason,
            })
          }
        >
          <Input
            label="Suspension Reason (Required)"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Minimum 5 characters..."
          />
        </ConfirmationDialog>
      )}

      {/* Activate Confirmation Dialog */}
      {activateUser && (
        <ConfirmationDialog
          open={!!activateUser}
          onOpenChange={(open) => !open && setActivateUser(null)}
          title={`Activate Account: ${activateUser.email}`}
          description="Restore full system and booking privileges for this user account."
          confirmLabel="Re-activate User"
          variant="primary"
          isLoading={activateMutation.isPending}
          onConfirm={() => activateMutation.mutate(activateUser.id)}
        />
      )}
    </div>
  );
}
