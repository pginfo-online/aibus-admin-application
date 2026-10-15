'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Headphones,
  ArrowLeft,
  Send,
  Lock,
  User,
  Ticket,
  Clock,
  Shield,
  MessageSquare,
} from 'lucide-react';
import type { SupportTicketDetailsData, SupportTicketStatus, SupportTicketPriority } from '@/types/api';

export default function SupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ticketId = params.id as string;

  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // Status & Priority inline edit
  const [ticketStatus, setTicketStatus] = useState<SupportTicketStatus>('OPEN');
  const [ticketPriority, setTicketPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [formInitialized, setFormInitialized] = useState(false);

  // Fetch Ticket Details
  const ticketQuery = useQuery({
    queryKey: ['admin', 'support', 'detail', ticketId],
    queryFn: async () => {
      const res = await apiClient.get<SupportTicketDetailsData>(`/admin/support/tickets/${ticketId}`);
      if (!formInitialized && res.data) {
        setTicketStatus(res.data.status);
        setTicketPriority(res.data.priority);
        setFormInitialized(true);
      }
      return res.data;
    },
    enabled: !!ticketId,
  });

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/support/tickets/${ticketId}/reply`, {
        message: replyMessage,
        isInternal,
      });
    },
    onSuccess: () => {
      toast.success(isInternal ? 'Internal agent note added' : 'Customer response sent');
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'detail', ticketId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit response');
    },
  });

  // Update Status/Priority Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ status, priority }: { status?: SupportTicketStatus; priority?: SupportTicketPriority }) => {
      return apiClient.patch(`/admin/support/tickets/${ticketId}`, {
        status,
        priority,
      });
    },
    onSuccess: () => {
      toast.success('Ticket lifecycle updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'detail', ticketId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update ticket');
    },
  });

  const t = ticketQuery.data;

  if (ticketQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (ticketQuery.isError || !t) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/support')}
        >
          Back to Support Desk
        </Button>
        <ErrorState
          title="Ticket Not Found"
          message={ticketQuery.error?.message || 'Could not locate the requested support ticket.'}
          onRetry={() => ticketQuery.refetch()}
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
          onClick={() => router.push('/support')}
        >
          Support Desk
        </Button>
      </div>

      <PageHeader
        title={`Ticket #${t.ticketNumber}: ${t.subject}`}
        description={`Category: ${t.category} • Opened on ${formatDateTime(t.createdAt)}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(t.status)} size="md">
              {t.status}
            </Badge>
            <Badge
              variant={t.priority === 'URGENT' ? 'destructive' : t.priority === 'HIGH' ? 'warning' : 'neutral'}
              size="md"
            >
              {t.priority}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Issue Description & Conversation Thread */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Inquiry Card */}
          <Card>
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-amber-500" />
                  {t.user?.fullName || t.user?.email || 'Customer'}
                </span>
                <span className="text-slate-400">{formatDateTime(t.createdAt)}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {t.description}
              </p>
            </CardContent>
          </Card>

          {/* Conversation & Internal Notes Thread */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Discussion Thread ({t.replies?.length || 0})
            </h3>

            {t.replies && t.replies.length > 0 ? (
              <div className="space-y-3">
                {t.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-xl border p-4 text-xs transition-all ${
                      reply.isInternal
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {reply.sender?.fullName || reply.sender?.email || 'Staff Agent'}
                        </span>
                        {reply.isInternal ? (
                          <Badge variant="gold" size="sm" className="flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Internal Agent Note
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Public Reply
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No replies posted to this ticket yet.</p>
            )}

            {/* Reply Composer */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Compose Response
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" /> Private Internal Note (Staff only)
                  </span>
                </label>
              </div>

              <Textarea
                rows={3}
                placeholder={
                  isInternal
                    ? 'Write confidential notes for other support staff (invisible to customer)...'
                    : 'Write response to customer...'
                }
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />

              <div className="flex justify-end">
                <Button
                  variant={isInternal ? 'outline' : 'gold'}
                  size="sm"
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                  isLoading={replyMutation.isPending}
                  disabled={!replyMessage.trim()}
                  onClick={() => replyMutation.mutate()}
                >
                  {isInternal ? 'Save Internal Note' : 'Send Customer Reply'}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Col: Ticket Controls & Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ticket State & Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Ticket Status"
                value={ticketStatus}
                onChange={(e) => {
                  const newStatus = e.target.value as SupportTicketStatus;
                  setTicketStatus(newStatus);
                  updateMutation.mutate({ status: newStatus });
                }}
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="AWAITING_CUSTOMER">AWAITING_CUSTOMER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="ESCALATED">ESCALATED</option>
              </Select>

              <Select
                label="Priority Level"
                value={ticketPriority}
                onChange={(e) => {
                  const newPri = e.target.value as SupportTicketPriority;
                  setTicketPriority(newPri);
                  updateMutation.mutate({ priority: newPri });
                }}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </Select>
            </CardContent>
          </Card>

          {/* Customer & Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Associated Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {t.user ? (
                <div>
                  <p className="text-slate-500">Customer</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {t.user.fullName || t.user.email}
                  </p>
                  <p className="text-slate-400">{t.user.email}</p>
                </div>
              ) : (
                <p className="text-slate-400">Guest submission without user link</p>
              )}

              {t.bookingId && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-slate-500">Linked Booking</p>
                  <Link
                    href={`/bookings/${t.bookingId}`}
                    className="text-amber-500 hover:underline font-mono font-semibold"
                  >
                    View Booking Reference ↗
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
