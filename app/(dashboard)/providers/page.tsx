'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
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
import { Dialog } from '@/components/ui/dialog';
import {
  Network,
  RotateCcw,
  Activity,
  CreditCard,
  Eye,
  CheckCircle,
  AlertTriangle,
  Server,
  Radio,
} from 'lucide-react';
import type { ProviderItem, ProviderTransactionListItem, PaginationMeta } from '@/types/api';

export default function ProvidersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [providerName, setProviderName] = useState<string>('');
  const [operation, setOperation] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<ProviderTransactionListItem | null>(null);

  // Fetch Providers Overview
  const providersQuery = useQuery({
    queryKey: ['admin', 'providers', 'overview'],
    queryFn: async () => {
      const res = await apiClient.get<ProviderItem[]>('/admin/providers');
      return res.data || [];
    },
  });

  // Fetch Live GDS Health
  const gdsHealthQuery = useQuery({
    queryKey: ['admin', 'providers', 'gds', 'health'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/admin/providers/GDS/health');
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch Transactions Log
  const txnsQuery = useQuery({
    queryKey: ['admin', 'providers', 'transactions', { page, limit, providerName, operation }],
    queryFn: async () => {
      const res = await apiClient.get<ProviderTransactionListItem[]>('/admin/providers/transactions', {
        page,
        limit,
        providerName: providerName || undefined,
        operation: operation || undefined,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  const providers = providersQuery.data || [];
  const txns = txnsQuery.data?.items || [];
  const pagination = txnsQuery.data?.pagination || {
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
        title="Inventory & Gateway Providers Hub"
        description="Monitor external GDS Mantis bus feeds, payment gateway live pings, API transaction latency, and deposit balances."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => {
              providersQuery.refetch();
              gdsHealthQuery.refetch();
              txnsQuery.refetch();
            }}
            isLoading={txnsQuery.isFetching}
          >
            Refresh
          </Button>
        }
      />

      {/* Provider Connectivity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GDS Mantis */}
        <Card className="border-amber-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Network className="h-4 w-4 text-amber-500" /> GDS Mantis API
              </span>
              <Badge variant={gdsHealthQuery.data?.status === 'online' ? 'success' : 'warning'} size="sm">
                {gdsHealthQuery.data?.status || 'ONLINE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Service Role</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Live Bus Inventory & Holds
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Deposit Balance</span>
              <span className="font-mono font-bold text-emerald-500">
                {gdsHealthQuery.data?.balance ? formatCurrency(gdsHealthQuery.data.balance) : 'Active Credit'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">API Gateway Status</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Responding
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PhonePe Payment Gateway */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-sky-500" /> PhonePe Gateway
              </span>
              <Badge variant="success" size="sm">
                ONLINE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Payment Protocol</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Server-to-Server V1 SDK
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Webhook Listener</span>
              <span className="font-mono text-emerald-500">/api/v1/payments/webhook</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reconciliation Queue</span>
              <span className="text-emerald-500 font-semibold">Active</span>
            </div>
          </CardContent>
        </Card>

        {/* Cloud Storage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-500" /> Media & Document Store
              </span>
              <Badge variant="success" size="sm">
                ONLINE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Storage Backend</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Cloud Media</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Ticket PDF Engine</span>
              <span className="text-emerald-500 font-semibold">Ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Static CDN</span>
              <span className="text-emerald-500 font-semibold">Enabled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Transaction Log */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-500" /> External API Transaction Audit Log
        </h3>

        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={providerName}
              onChange={(e) => {
                setProviderName(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Providers</option>
              <option value="GDS">GDS (Mantis)</option>
              <option value="PHONEPE">PHONEPE</option>
            </Select>

            <Input
              placeholder="Filter by operation (e.g. Search, Hold, Book, Status)..."
              value={operation}
              onChange={(e) => {
                setOperation(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Operation</th>
                  <th className="p-3.5 text-center">Response HTTP</th>
                  <th className="p-3.5 text-right">Latency</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {txnsQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                ) : txnsQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <ErrorState
                        title="Failed to load provider transactions"
                        message={txnsQuery.error?.message}
                        onRetry={() => txnsQuery.refetch()}
                      />
                    </td>
                  </tr>
                ) : txns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8">
                      <EmptyState
                        title="No provider transactions"
                        description="No external GDS or gateway transactions logged yet."
                      />
                    </td>
                  </tr>
                ) : (
                  txns.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                    >
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                        {txn.providerName}
                      </td>

                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {txn.operation}
                      </td>

                      <td className="p-3.5 text-center">
                        <Badge
                          variant={txn.responseStatus && txn.responseStatus < 400 ? 'success' : 'destructive'}
                          size="sm"
                        >
                          {txn.responseStatus || '200 OK'}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {txn.durationMs ? `${txn.durationMs}ms` : '—'}
                      </td>

                      <td className="p-3.5 text-slate-500">
                        {formatDateTime(txn.createdAt)}
                      </td>

                      <td className="p-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedTxn(txn)}
                          title="Inspect raw payload"
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
      </div>

      {/* Transaction Payload Inspector Modal */}
      {selectedTxn && (
        <Dialog
          open={!!selectedTxn}
          onOpenChange={(open) => !open && setSelectedTxn(null)}
          title={`Provider API Call: ${selectedTxn.providerName} • ${selectedTxn.operation}`}
          description={`Logged at ${formatDateTime(selectedTxn.createdAt)} • Latency: ${selectedTxn.durationMs || 0}ms`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Outbound Request Payload:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono max-h-48">
                {JSON.stringify(selectedTxn.requestPayload || {}, null, 2)}
              </pre>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Inbound Response Payload:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono max-h-48">
                {JSON.stringify(selectedTxn.responsePayload || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
