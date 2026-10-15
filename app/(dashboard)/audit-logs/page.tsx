'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import {
  ShieldCheck,
  RotateCcw,
  Download,
  Eye,
  Filter,
  Search,
} from 'lucide-react';
import type { AuditLogListItem, PaginationMeta } from '@/types/api';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [module, setModule] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'module' | 'action'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Inspector modal
  const [selectedLog, setSelectedLog] = useState<AuditLogListItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Audit Logs
  const auditQuery = useQuery({
    queryKey: ['admin', 'audit-logs', 'list', { page, limit, module, action, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<AuditLogListItem[]>('/admin/audit-logs', {
        page,
        limit,
        module: module || undefined,
        action: action || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await apiClient.download('/admin/audit-logs/export', {
        format: 'csv',
        module: module || undefined,
        action: action || undefined,
      }, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Audit log CSV exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const logs = auditQuery.data?.items || [];
  const pagination = auditQuery.data?.pagination || {
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
        title="Security & Compliance Audit Trail"
        description="Immutable record of administrative mutations, configuration adjustments, and user privilege alterations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              isLoading={isExporting}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => auditQuery.refetch()}
              isLoading={auditQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Administrative Modules</option>
            <option value="user-management">User Management</option>
            <option value="booking-management">Booking Operations</option>
            <option value="payment-management">Payment Management</option>
            <option value="refund-management">Refund Management</option>
            <option value="city-management">City Management</option>
            <option value="operator-management">Operator Management</option>
            <option value="coupon-management">Coupon Management</option>
            <option value="support-management">Support Management</option>
            <option value="notification-management">Notification Management</option>
            <option value="system-config">System Configuration</option>
          </Select>

          <Input
            placeholder="Filter by action (e.g. PATCH, POST)..."
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="module">Sort: Module</option>
            <option value="action">Sort: Action</option>
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

      {/* Audit Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Admin Email</th>
                <th className="p-3.5">Module</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {auditQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
              ) : auditQuery.isError ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <ErrorState
                      title="Failed to load audit logs"
                      message={auditQuery.error?.message}
                      onRetry={() => auditQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      title="No audit entries found"
                      description="No administrative activities match the current filter selection."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 text-slate-500 font-mono">
                      {formatDateTime(log.createdAt)}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      {log.admin?.email || log.adminId.slice(0, 8)}
                    </td>

                    <td className="p-3.5">
                      <Badge variant="neutral" size="sm">
                        {log.module}
                      </Badge>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {log.action}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '—'}
                    </td>

                    <td className="p-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedLog(log)}
                        title="View sanitized payload"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
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

      {/* Log Details Modal */}
      {selectedLog && (
        <Dialog
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
          title="Audit Entry Inspector"
          description={`Logged action on ${selectedLog.module}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="text-slate-400">Admin ID:</span>
                <p className="font-mono">{selectedLog.adminId}</p>
              </div>
              <div>
                <span className="text-slate-400">Timestamp:</span>
                <p>{formatDateTime(selectedLog.createdAt)}</p>
              </div>
              <div>
                <span className="text-slate-400">User Agent:</span>
                <p className="truncate">{selectedLog.userAgent || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Request ID:</span>
                <p className="font-mono truncate">{selectedLog.requestId || '—'}</p>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Sanitized Request Payload:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
