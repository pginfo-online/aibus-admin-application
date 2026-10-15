'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Bell,
  RotateCcw,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { NotificationListItem, NotificationTemplateItem, PaginationMeta, NotificationChannel, NotificationStatus } from '@/types/api';

export default function NotificationsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [channel, setChannel] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'sentAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch Notification Logs
  const notificationsQuery = useQuery({
    queryKey: ['admin', 'notifications', 'list', { page, limit, channel, status, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<NotificationListItem[]>('/admin/notifications', {
        page,
        limit,
        channel: channel || undefined,
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

  // Fetch Notification Templates
  const templatesQuery = useQuery({
    queryKey: ['admin', 'notifications', 'templates'],
    queryFn: async () => {
      const res = await apiClient.get<NotificationTemplateItem[]>('/admin/notifications/templates');
      return res.data || [];
    },
  });

  // Retry Failed Dispatch Mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/notifications/${id}/retry`);
    },
    onSuccess: () => {
      toast.success('Notification queued for retry');
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Retry failed');
    },
  });

  const notifications = notificationsQuery.data?.items || [];
  const pagination = notificationsQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const getChannelIcon = (ch: NotificationChannel) => {
    switch (ch) {
      case 'EMAIL':
        return <Mail className="h-3.5 w-3.5 text-sky-500" />;
      case 'SMS':
        return <Smartphone className="h-3.5 w-3.5 text-emerald-500" />;
      case 'WHATSAPP':
        return <MessageSquare className="h-3.5 w-3.5 text-green-500" />;
      case 'PUSH':
      default:
        return <Bell className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Management"
        description="Audit multi-channel communications (Email, SMS, WhatsApp, Push), review templates, and broadcast alerts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => notificationsQuery.refetch()}
              isLoading={notificationsQuery.isFetching}
            >
              Refresh
            </Button>
            <Link href="/notifications/broadcast">
              <Button variant="gold" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                Broadcast Alert
              </Button>
            </Link>
          </div>
        }
      />

      {/* Templates Strip */}
      {templatesQuery.data && templatesQuery.data.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Standard Notification Templates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {templatesQuery.data.slice(0, 4).map((tmpl) => (
              <Card key={tmpl.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {tmpl.name}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {tmpl.channels?.join(', ') || 'No channels'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{tmpl.id}</p>
                <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-mono truncate">
                  Vars: {tmpl.placeholders?.join(', ') || 'None'}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Channels</option>
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
            <option value="PUSH">PUSH</option>
            <option value="WHATSAPP">WHATSAPP</option>
          </Select>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="SENT">SENT</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="sentAt">Sort: Sent Date</option>
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

      {/* Notifications Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Channel</th>
                <th className="p-3.5">Type & Title</th>
                <th className="p-3.5">Recipient</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {notificationsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
              ) : notificationsQuery.isError ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <ErrorState
                      title="Failed to load notifications"
                      message={notificationsQuery.error?.message}
                      onRetry={() => notificationsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      title="No notifications recorded"
                      description="No notification deliveries match the filter."
                    />
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr
                    key={n.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        {getChannelIcon(n.channel)}
                        {n.channel}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{n.type.toLowerCase().replace(/_/g, ' ')}</p>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {n.recipient}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(n.status)} size="sm">
                        {n.status}
                      </Badge>
                      {n.error && (
                        <p className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[150px]">
                          {n.error}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(n.sentAt || n.createdAt)}
                    </td>

                    <td className="p-3.5 text-right">
                      {n.status === 'FAILED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-500 hover:text-rose-600"
                          isLoading={retryMutation.isPending && retryMutation.variables === n.id}
                          onClick={() => retryMutation.mutate(n.id)}
                        >
                          Retry
                        </Button>
                      )}
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
