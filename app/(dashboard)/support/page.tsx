'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Search,
  Plus,
  RotateCcw,
  Headphones,
  Eye,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import type { SupportTicketListItem, PaginationMeta, SupportCategory, SupportTicketPriority } from '@/types/api';

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Create Ticket Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>('BOOKING');
  const [ticketPriority, setTicketPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [userId, setUserId] = useState('');
  const [bookingId, setBookingId] = useState('');

  // Fetch Tickets
  const ticketsQuery = useQuery({
    queryKey: ['admin', 'support', 'tickets', { page, limit, search, status, priority, category, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<SupportTicketListItem[]>('/admin/support/tickets', {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Create Ticket Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/support/tickets', {
        subject,
        description,
        category: ticketCategory,
        priority: ticketPriority,
        userId: userId || undefined,
        bookingId: bookingId || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Support ticket created');
      setCreateModalOpen(false);
      setSubject('');
      setDescription('');
      setUserId('');
      setBookingId('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create ticket');
    },
  });

  const tickets = ticketsQuery.data?.items || [];
  const pagination = ticketsQuery.data?.pagination || {
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
        title="Support Grievance Desk"
        description="Customer service escalations, booking grievance tickets, internal agent collaboration, and resolution tracking."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => ticketsQuery.refetch()}
              isLoading={ticketsQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Open Ticket
            </Button>
          </div>
        }
      />

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search ticket #, subject, customer..."
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
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="AWAITING_CUSTOMER">AWAITING_CUSTOMER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ESCALATED">ESCALATED</option>
          </Select>

          <Select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </Select>

          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            <option value="BOOKING">BOOKING</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="REFUND">REFUND</option>
            <option value="CANCELLATION">CANCELLATION</option>
            <option value="GENERAL">GENERAL</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
            <option value="updatedAt">Sort: Last Updated</option>
          </Select>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Ticket ID</th>
                <th className="p-3.5">Subject & Category</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5 text-center">Priority</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {ticketsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : ticketsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load support tickets"
                      message={ticketsQuery.error?.message}
                      onRetry={() => ticketsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No support tickets found"
                      description="No customer grievances matched the selected filter."
                      actionLabel="Open New Ticket"
                      onAction={() => setCreateModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-amber-500">
                      <Link href={`/support/${t.id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>

                    <td className="p-3.5">
                      <Link
                        href={`/support/${t.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-500 transition-colors"
                      >
                        {t.subject}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {t.category}
                        </span>
                        {t._count?.replies ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            • <MessageSquare className="h-3 w-3 inline" /> {t._count.replies}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {t.user?.fullName || t.user?.email || 'Guest'}
                      </p>
                      {t.user?.phone && (
                        <p className="text-[10px] text-slate-400">{t.user.phone}</p>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge
                        variant={t.priority === 'URGENT' ? 'destructive' : t.priority === 'HIGH' ? 'warning' : 'neutral'}
                        size="sm"
                      >
                        {t.priority}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                        {t.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(t.createdAt)}
                    </td>

                    <td className="p-3.5 text-right">
                      <Link href={`/support/${t.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Respond to ticket">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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

      {/* Create Ticket Modal */}
      <Dialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Open Support Ticket"
        description="Register a customer grievance or operational support inquiry."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Input
            label="Ticket Subject (Required)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Booking failed but amount debited"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value as any)}
            >
              <option value="BOOKING">BOOKING</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="REFUND">REFUND</option>
              <option value="CANCELLATION">CANCELLATION</option>
              <option value="GENERAL">GENERAL</option>
              <option value="OTHER">OTHER</option>
            </Select>

            <Select
              label="Priority Level"
              value={ticketPriority}
              onChange={(e) => setTicketPriority(e.target.value as any)}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="User ID (UUID, Optional)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            />
            <Input
              label="Booking ID (UUID, Optional)"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            />
          </div>

          <Textarea
            label="Issue Description (Required)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed overview of grievance, error messages, and customer feedback..."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Submit Ticket
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
