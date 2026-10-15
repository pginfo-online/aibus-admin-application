'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/toast-store';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Ticket,
  Users,
  Undo2,
  CreditCard,
} from 'lucide-react';

interface ReportCardProps {
  title: string;
  description: string;
  endpoint: string;
  icon: React.ReactNode;
  filename: string;
  startDate?: string;
  endDate?: string;
}

function ReportExportCard({
  title,
  description,
  endpoint,
  icon,
  filename,
  startDate,
  endDate,
}: ReportCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await apiClient.download(
        endpoint,
        {
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          format: 'csv',
        },
        `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      toast.success(`${title} downloaded successfully`);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between p-5 hover:border-amber-500/40 transition-colors">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <span className="text-[10px] text-slate-400 font-mono">Streaming RFC 4180 CSV</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Button
          variant="gold"
          size="sm"
          leftIcon={<Download className="h-3.5 w-3.5" />}
          isLoading={downloading}
          onClick={handleDownload}
        >
          Export CSV
        </Button>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const today = new Date();
    setStartDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setEndDate(today.toISOString().slice(0, 10));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytical Reports & Data Exports"
        description="Stream memory-efficient CSV datasets directly from PostgreSQL with UTF-8 BOM encoding for Excel."
      />

      {/* Global Date Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-amber-500" /> Date Boundary Filter:
          </span>
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportExportCard
          title="Revenue Financial Report"
          description="Gross revenue, payment fees, operator splits, and confirmed financial settlement breakdown."
          endpoint="/admin/reports/revenue"
          filename="revenue-report"
          icon={<DollarSign className="h-5 w-5" />}
          startDate={startDate}
          endDate={endDate}
        />

        <ReportExportCard
          title="Bookings Manifest Report"
          description="Complete passenger reservation history, routes, seat assignments, fares, and journey statuses."
          endpoint="/admin/reports/bookings"
          filename="bookings-report"
          icon={<Ticket className="h-5 w-5" />}
          startDate={startDate}
          endDate={endDate}
        />

        <ReportExportCard
          title="User Registrations Report"
          description="Customer accounts, contact emails, registration dates, roles, and status distributions."
          endpoint="/admin/reports/users"
          filename="users-report"
          icon={<Users className="h-5 w-5" />}
          startDate={startDate}
          endDate={endDate}
        />

        <ReportExportCard
          title="Cancellations & Refunds Report"
          description="Seat cancellations, policy penalty charges, refunded values, and settlement turnaround."
          endpoint="/admin/reports/cancellations"
          filename="cancellations-report"
          icon={<Undo2 className="h-5 w-5" />}
          startDate={startDate}
          endDate={endDate}
        />

        <ReportExportCard
          title="Gateway Payments Audit Report"
          description="Raw gateway transaction references, PhonePe verification logs, and settlement timestamps."
          endpoint="/admin/reports/payments"
          filename="payments-report"
          icon={<CreditCard className="h-5 w-5" />}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}
