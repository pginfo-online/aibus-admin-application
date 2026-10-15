'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Scale,
  RotateCcw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import type {
  LedgerEntryItem,
  ReconciliationReportData,
  ManualAdjustmentInput,
  PaginationMeta,
  LedgerEntryType,
} from '@/types/api';

export default function LedgerPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'journal' | 'reconciliation'>('journal');

  // Journal Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [agentIdFilter, setAgentIdFilter] = useState('');
  const [bookingIdFilter, setBookingIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Manual Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<ManualAdjustmentInput>({
    agentId: '',
    amount: 1000,
    direction: 'CREDIT_AGENT',
    reason: '',
  });

  // Query Ledger Entries
  const journalQuery = useQuery({
    queryKey: [
      'admin',
      'ledger',
      'entries',
      { page, limit, agentIdFilter, bookingIdFilter, typeFilter, fromDate, toDate },
    ],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: LedgerEntryItem[]; pagination: PaginationMeta }>(
        '/admin/ledger/entries',
        {
          page,
          limit,
          agentId: agentIdFilter || undefined,
          bookingId: bookingIdFilter || undefined,
          type: typeFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }
      );
      return res.data;
    },
    enabled: activeTab === 'journal',
  });

  // Query Daily Reconciliation Audit
  const reconQuery = useQuery({
    queryKey: ['admin', 'ledger', 'reconciliation'],
    queryFn: async () => {
      const res = await apiClient.get<ReconciliationReportData>('/admin/ledger/reconciliation');
      return res.data;
    },
    enabled: activeTab === 'reconciliation',
    refetchInterval: 60000,
  });

  // Manual Adjustment Mutation
  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!adjustForm.agentId.trim()) throw new Error('Agent UUID is required');
      if (adjustForm.amount <= 0) throw new Error('Adjustment amount must be greater than zero');
      if (adjustForm.reason.trim().length < 5) {
        throw new Error('Audit reason must be at least 5 characters');
      }

      return apiClient.post('/admin/ledger/adjustments', {
        agentId: adjustForm.agentId.trim(),
        amount: Number(adjustForm.amount),
        direction: adjustForm.direction,
        reason: adjustForm.reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Balanced double-entry adjustment posted successfully');
      setAdjustModalOpen(false);
      setAdjustForm({
        agentId: '',
        amount: 1000,
        direction: 'CREDIT_AGENT',
        reason: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post manual adjustment');
    },
  });

  const entries = journalQuery.data?.entries || [];
  const pagination = journalQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const reconData = reconQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Double-Entry Financial Ledger & Platform Reconciliation"
        description="Real-time transactional audit trail with mathematical zero-delta balance enforcement and daily wallet reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                if (activeTab === 'journal') journalQuery.refetch();
                else reconQuery.refetch();
              }}
              isLoading={journalQuery.isFetching || reconQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setAdjustModalOpen(true)}
            >
              Post Manual Adjustment
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'journal'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Double-Entry Journal
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'reconciliation'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Daily Reconciliation Audit Desk
        </button>
      </div>

      {/* VIEW: Double-Entry Journal */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input
                placeholder="Filter by Agent UUID..."
                leftIcon={<Search className="h-4 w-4" />}
                value={agentIdFilter}
                onChange={(e) => {
                  setAgentIdFilter(e.target.value);
                  setPage(1);
                }}
              />

              <Input
                placeholder="Filter by Booking UUID..."
                value={bookingIdFilter}
                onChange={(e) => {
                  setBookingIdFilter(e.target.value);
                  setPage(1);
                }}
              />

              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Transaction Types</option>
                <option value="AGENT_WALLET_TOPUP">AGENT_WALLET_TOPUP</option>
                <option value="AGENT_WALLET_DEBIT">AGENT_WALLET_DEBIT</option>
                <option value="AGENT_WALLET_CREDIT">AGENT_WALLET_CREDIT</option>
                <option value="COMMISSION_CREDIT">COMMISSION_CREDIT</option>
                <option value="COMMISSION_REVERSAL">COMMISSION_REVERSAL</option>
                <option value="REFUND_CREDIT">REFUND_CREDIT</option>
                <option value="CONVENIENCE_FEE_DEBIT">CONVENIENCE_FEE_DEBIT</option>
                <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
                <option value="PLATFORM_REVENUE_CREDIT">PLATFORM_REVENUE_CREDIT</option>
              </Select>

              <Input
                type="date"
                label=""
                placeholder="From Date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />

              <Input
                type="date"
                label=""
                placeholder="To Date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </Card>

          {/* Journal Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    <th className="p-3.5">Batch / Entry ID</th>
                    <th className="p-3.5">Transaction Type</th>
                    <th className="p-3.5">Agency / Reference</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-right">Debit (Dr)</th>
                    <th className="p-3.5 text-right">Credit (Cr)</th>
                    <th className="p-3.5">Posted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {journalQuery.isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                  ) : journalQuery.isError ? (
                    <tr>
                      <td colSpan={7} className="p-6">
                        <ErrorState
                          title="Failed to load ledger records"
                          message={journalQuery.error?.message}
                          onRetry={() => journalQuery.refetch()}
                        />
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8">
                        <EmptyState
                          title="No ledger entries found"
                          description="No records match your search criteria."
                          actionLabel="Reset Filters"
                          onAction={() => {
                            setAgentIdFilter('');
                            setBookingIdFilter('');
                            setTypeFilter('');
                            setFromDate('');
                            setToDate('');
                            setPage(1);
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                      >
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {entry.batchId ? `${entry.batchId.slice(0, 8)}…` : entry.id.slice(0, 8)}
                          </span>
                          {entry.idempotencyKey && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {entry.idempotencyKey}
                            </p>
                          )}
                        </td>

                        <td className="p-3.5">
                          <Badge variant={getStatusBadgeVariant(entry.type)} size="sm">
                            {entry.type.replace(/_/g, ' ')}
                          </Badge>
                        </td>

                        <td className="p-3.5">
                          {entry.agent ? (
                            <Link
                              href={`/agents/${entry.agent.id}`}
                              className="font-semibold text-amber-600 dark:text-amber-400 hover:underline block"
                            >
                              {entry.agent.businessName}
                            </Link>
                          ) : entry.agentId ? (
                            <span className="font-mono text-[11px] text-slate-400">
                              {entry.agentId.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Platform Account</span>
                          )}

                          {entry.booking?.bookingNumber && (
                            <Link
                              href={`/bookings/${entry.bookingId}`}
                              className="text-[10px] text-slate-500 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              Bkg: {entry.booking.bookingNumber} <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-700 dark:text-slate-300 max-w-sm truncate">
                          {entry.description}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '—'}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '—'}
                        </td>

                        <td className="p-3.5 text-slate-500">
                          {formatDateTime(entry.postedAt)}
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
      )}

      {/* VIEW: Daily Reconciliation Audit Desk */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Recon KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Agents Audited</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {reconData?.totalAgentsAudited || 0}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Automated daily balance audit</p>
            </Card>

            <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Fully Matched</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {reconData?.matchedAgents || 0}
              </p>
              <p className="text-xs text-emerald-600/70 mt-0.5">Zero delta discrepancy</p>
            </Card>

            <Card className="p-4 border-rose-500/20 bg-rose-500/5">
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Discrepancies</p>
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {reconData?.discrepantAgents || 0}
              </p>
              <p className="text-xs text-rose-600/70 mt-0.5">Require audit investigation</p>
            </Card>

            <Card className="p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Last Run Timestamp</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-2 truncate">
                {reconData?.auditTimestamp ? formatDateTime(reconData.auditTimestamp) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">BullMQ scheduled worker</p>
            </Card>
          </div>

          {/* Reconciliation Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Partner Agency Ledger Audit Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      <th className="p-3.5">Agency Name</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Current Wallet Balance</th>
                      <th className="p-3.5 text-right">Ledger Calculated (Cr - Dr)</th>
                      <th className="p-3.5 text-right">Delta Discrepancy</th>
                      <th className="p-3.5 text-center">Audit Result</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {reconQuery.isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                    ) : !reconData?.agents || reconData.agents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                          No agent balance audits recorded yet.
                        </td>
                      </tr>
                    ) : (
                      reconData.agents.map((agent) => (
                        <tr
                          key={agent.agentId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                        >
                          <td className="p-3.5">
                            <Link
                              href={`/agents/${agent.agentId}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-amber-500"
                            >
                              {agent.businessName}
                            </Link>
                          </td>

                          <td className="p-3.5 text-center">
                            <Badge variant={getStatusBadgeVariant(agent.status)} size="sm">
                              {agent.status}
                            </Badge>
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(agent.currentBalance)}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatCurrency(agent.calculatedBalance)}
                          </td>

                          <td className="p-3.5 text-right font-mono">
                            {agent.discrepancy > 0 ? (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {formatCurrency(agent.discrepancy)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₹0.00</span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <Badge
                              variant={agent.reconciliationStatus === 'MATCHED' ? 'success' : 'destructive'}
                              size="sm"
                            >
                              {agent.reconciliationStatus === 'MATCHED' ? 'MATCHED' : 'DISCREPANCY'}
                            </Badge>
                          </td>

                          <td className="p-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-amber-500"
                              onClick={() => {
                                setAdjustForm({
                                  ...adjustForm,
                                  agentId: agent.agentId,
                                });
                                setAdjustModalOpen(true);
                              }}
                            >
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Balanced Adjustment Dialog */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500" />
              Post Balanced Double-Entry Adjustment
            </DialogTitle>
            <DialogDescription>
              Create an immutable double-entry journal transaction that updates the agent wallet and platform revenue balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
              <p className="font-semibold">Financial Ledger Guarantee:</p>
              <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Adjustments post balanced pairs where SUM(Debit) == SUM(Credit). Entries cannot be modified once committed.
              </p>
            </div>

            <Input
              label="Partner Agency UUID *"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={adjustForm.agentId}
              onChange={(e) => setAdjustForm({ ...adjustForm, agentId: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Adjustment Direction *"
                value={adjustForm.direction}
                onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value as any })}
              >
                <option value="CREDIT_AGENT">Credit Agent (+ Wallet)</option>
                <option value="DEBIT_AGENT">Debit Agent (- Wallet)</option>
              </Select>

              <Input
                label="Amount (INR) *"
                type="number"
                min={1}
                max={1000000}
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: Number(e.target.value) })}
              />
            </div>

            <Input
              label="Mandatory Audit Reason *"
              placeholder="e.g. Resolving reconciliation discrepancy for ticket #12345"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              helperText="Min 5 characters. This audit note is permanently recorded in the ledger."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              isLoading={adjustmentMutation.isPending}
              onClick={() => adjustmentMutation.mutate()}
            >
              Post Adjustment Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
