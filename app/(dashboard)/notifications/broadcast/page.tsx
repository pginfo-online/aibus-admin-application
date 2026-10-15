'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/toast-store';
import { Send, ArrowLeft, Radio, Bell } from 'lucide-react';
import type { NotificationChannel, NotificationType, UserRole } from '@/types/api';

export default function BroadcastNotificationPage() {
  const router = useRouter();

  const [channel, setChannel] = useState<NotificationChannel>('PUSH');
  const [type, setType] = useState<NotificationType>('TRIP_REMINDER');
  const [targetRole, setTargetRole] = useState<UserRole>('CUSTOMER');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/notifications/broadcast', {
        channel,
        type,
        targetRole,
        title,
        message,
      });
    },
    onSuccess: () => {
      toast.success('Broadcast notification queued for delivery');
      router.push('/notifications');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to dispatch broadcast');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/notifications')}
        >
          Notifications
        </Button>
      </div>

      <PageHeader
        title="Broadcast System Notification"
        description="Dispatch marketing alerts, service advisories, or operational updates to user cohorts."
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-500 animate-pulse" /> Notification Dispatcher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Delivery Channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as NotificationChannel)}
              >
                <option value="PUSH">PUSH NOTIFICATION</option>
                <option value="EMAIL">EMAIL</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WHATSAPP</option>
              </Select>

              <Select
                label="Notification Type"
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
              >
                <option value="TRIP_REMINDER">TRIP_REMINDER</option>
                <option value="BOOKING_CONFIRMATION">BOOKING_CONFIRMATION</option>
                <option value="PAYMENT_REMINDER">PAYMENT_REMINDER</option>
              </Select>

              <Select
                label="Target User Role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
              >
                <option value="CUSTOMER">ALL CUSTOMERS</option>
                <option value="OPERATOR_AGENT">OPERATOR AGENTS</option>
                <option value="SUPPORT_AGENT">SUPPORT STAFF</option>
                <option value="ADMIN">ADMINISTRATORS</option>
              </Select>
            </div>

            <Input
              label="Notification Headline / Subject"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Update: Karnataka Intercity Routes"
            />

            <Textarea
              label="Message Body"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter customer-facing notification content..."
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/notifications')}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                leftIcon={<Send className="h-3.5 w-3.5" />}
                isLoading={broadcastMutation.isPending}
                disabled={!title.trim() || !message.trim()}
                onClick={() => broadcastMutation.mutate()}
              >
                Queue Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
