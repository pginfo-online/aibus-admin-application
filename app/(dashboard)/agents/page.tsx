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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Search,
  RotateCcw,
  Briefcase,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  Wallet,
} from 'lucide-react';
import type { AgentListItem, PaginationMeta, AgentStatus } from '@/types/api';

export default function AgentsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [city, setCity] = useState('');

  // Onboard Agent Modal State
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    businessName: '',
    contactPersonName: '',
    email: '',
    phone: '',
    password: '',
    businessAddress: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    panNumber: '',
  });

  // KYC Quick Review Modal State
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [selectedAgentForKyc, setSelectedAgentForKyc] = useState<AgentListItem | null>(null);
  const [kycAction, setKycAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');

  // Suspend Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedAgentForSuspend, setSelectedAgentForSuspend] = useState<AgentListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('Terms of service violation');

  // Reactivate Modal State
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [selectedAgentForReactivate, setSelectedAgentForReactivate] = useState<AgentListItem | null>(null);

  // Agents Query
  const agentsQuery = useQuery({
    queryKey: ['admin', 'agents', 'list', { page, limit, search, status, city }],
    queryFn: async () => {
      const res = await apiClient.get<{ agents: AgentListItem[]; pagination: PaginationMeta }>('/admin/agents', {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        city: city || undefined,
      });
      return res.data;
    },
  });

  // Onboard Agent Mutation
  const onboardMutation = useMutation({
    mutationFn: async () => {
      if (!onboardForm.businessName || !onboardForm.email || !onboardForm.phone || !onboardForm.password) {
        throw new Error('Please fill in all mandatory fields');
      }
      return apiClient.post('/agents/register', {
        ...onboardForm,
        pincode: onboardForm.pincode || undefined,
        gstNumber: onboardForm.gstNumber || undefined,
        panNumber: onboardForm.panNumber || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Agent onboarded successfully! Owner account created.');
      setOnboardOpen(false);
      setOnboardForm({
        businessName: '',
        contactPersonName: '',
        email: '',
        phone: '',
        password: '',
        businessAddress: '',
        city: '',
        state: '',
        pincode: '',
        gstNumber: '',
        panNumber: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to onboard agent');
    },
  });

  // KYC Review Mutation
  const kycMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentForKyc) return;
      return apiClient.post(`/admin/agents/${selectedAgentForKyc.id}/kyc-review`, {
        action: kycAction,
        rejectionReason: kycAction === 'REJECT' ? rejectionReason : undefined,
      });
    },
    onSuccess: () => {
      toast.success(`KYC review completed: ${kycAction}`);
      setKycModalOpen(false);
      setSelectedAgentForKyc(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update KYC status');
    },
  });

  // Suspend Agent Mutation
  const suspendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentForSuspend) return;
      return apiClient.post(`/admin/agents/${selectedAgentForSuspend.id}/suspend`, {
        reason: suspendReason,
      });
    },
    onSuccess: () => {
      toast.success('Agent suspended and wallet frozen');
      setSuspendModalOpen(false);
      setSelectedAgentForSuspend(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suspend agent');
    },
  });

  // Reactivate Agent Mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentForReactivate) return;
      return apiClient.post(`/admin/agents/${selectedAgentForReactivate.id}/reactivate`);
    },
    onSuccess: () => {
      toast.success('Agent reactivated and wallet unfrozen');
      setReactivateModalOpen(false);
      setSelectedAgentForReactivate(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reactivate agent');
    },
  });

  const agents = agentsQuery.data?.agents || [];
  const pagination = agentsQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Quick Metric Calculations from loaded batch
  const approvedCount = agents.filter((a) => a.status === 'APPROVED').length;
  const pendingKycCount = agents.filter((a) => ['PENDING_KYC', 'KYC_SUBMITTED', 'UNDER_REVIEW'].includes(a.status)).length;
  const suspendedCount = agents.filter((a) => a.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="B2B Agent Directory & Onboarding"
        description="Manage partner travel agencies, review KYC document submissions, monitor credit lines, and enforce compliance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => agentsQuery.refetch()}
              isLoading={agentsQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<UserPlus className="h-3.5 w-3.5" />}
              onClick={() => setOnboardOpen(true)}
            >
              Onboard Partner Agent
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Briefcase className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Agents</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {pagination.total}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Registered partner agencies</p>
        </Card>

        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Approved & Active</span>
          </div>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {approvedCount}
          </p>
          <p className="text-xs text-emerald-600/70 mt-0.5">KYC verified & booking enabled</p>
        </Card>

        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wider">KYC Awaiting Review</span>
          </div>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {pendingKycCount}
          </p>
          <p className="text-xs text-amber-600/70 mt-0.5">Documents pending approval</p>
        </Card>

        <Card className="p-4 border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Suspended</span>
          </div>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
            {suspendedCount}
          </p>
          <p className="text-xs text-rose-600/70 mt-0.5">Wallets frozen</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search business name, contact, email, phone..."
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
            <option value="">All Verification Statuses</option>
            <option value="APPROVED">APPROVED (Verified)</option>
            <option value="KYC_SUBMITTED">KYC_SUBMITTED (Action Required)</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="PENDING_KYC">PENDING_KYC</option>
            <option value="REJECTED">REJECTED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </Select>

          <Input
            placeholder="Filter by city (e.g. Mumbai, Bangalore)..."
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Agents Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Agency & Contact</th>
                <th className="p-3.5">City & State</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Cash Balance</th>
                <th className="p-3.5 text-right">Credit Line</th>
                <th className="p-3.5 text-center">KYC Docs</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {agentsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)
              ) : agentsQuery.isError ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <ErrorState
                      title="Failed to load agents"
                      message={agentsQuery.error?.message}
                      onRetry={() => agentsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="No partner agents found"
                      description="No B2B agencies match the selected search criteria."
                      actionLabel="Onboard First Agent"
                      onAction={() => setOnboardOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 block"
                      >
                        {agent.businessName}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {agent.contactPersonName} • {agent.phone}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{agent.email}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {agent.city}
                      </span>
                      <p className="text-[10px] text-slate-400">{agent.state}</p>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(agent.status)} size="sm">
                        {agent.status.replace(/_/g, ' ')}
                      </Badge>
                      {agent.wallet?.isFrozen && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1">WALLET FROZEN</p>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(agent.wallet?.cashBalance || 0)}
                    </td>

                    <td className="p-3.5 text-right">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(agent.wallet?.creditLimit || 0)}
                      </span>
                      {(agent.wallet?.creditUsed || 0) > 0 && (
                        <p className="text-[10px] text-amber-500">
                          Used: {formatCurrency(agent.wallet?.creditUsed || 0)}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        {agent._count?.kycDocuments || 0}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(agent.createdAt, false)}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/agents/${agent.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </Link>

                        {['KYC_SUBMITTED', 'UNDER_REVIEW', 'PENDING_KYC'].includes(agent.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            onClick={() => {
                              setSelectedAgentForKyc(agent);
                              setKycAction('APPROVE');
                              setKycModalOpen(true);
                            }}
                          >
                            Review KYC
                          </Button>
                        )}

                        {agent.status === 'SUSPENDED' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                            onClick={() => {
                              setSelectedAgentForReactivate(agent);
                              setReactivateModalOpen(true);
                            }}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-rose-500 hover:text-rose-600"
                            onClick={() => {
                              setSelectedAgentForSuspend(agent);
                              setSuspendModalOpen(true);
                            }}
                          >
                            Suspend
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

      {/* Onboard Partner Agent Modal Dialog */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              Onboard Partner Travel Agent
            </DialogTitle>
            <DialogDescription>
              Register a new B2B agency account. An owner profile with login credentials and a pre-funded wallet will be automatically provisioned.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Agency Legal / Business Name *"
                placeholder="e.g. Royal Travels Pvt Ltd"
                value={onboardForm.businessName}
                onChange={(e) => setOnboardForm({ ...onboardForm, businessName: e.target.value })}
              />
              <Input
                label="Primary Contact Person *"
                placeholder="e.g. Rajesh Sharma"
                value={onboardForm.contactPersonName}
                onChange={(e) => setOnboardForm({ ...onboardForm, contactPersonName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Business Email (Login) *"
                type="email"
                placeholder="agent@agency.com"
                value={onboardForm.email}
                onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
              />
              <Input
                label="Phone Number *"
                placeholder="+91 98765 43210"
                value={onboardForm.phone}
                onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
              />
              <Input
                label="Temporary Password *"
                type="password"
                placeholder="Min 8 characters"
                value={onboardForm.password}
                onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
              />
            </div>

            <Input
              label="Physical Business Address *"
              placeholder="Suite 101, Commercial Complex, MG Road"
              value={onboardForm.businessAddress}
              onChange={(e) => setOnboardForm({ ...onboardForm, businessAddress: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City *"
                placeholder="e.g. Bangalore"
                value={onboardForm.city}
                onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
              />
              <Input
                label="State *"
                placeholder="e.g. Karnataka"
                value={onboardForm.state}
                onChange={(e) => setOnboardForm({ ...onboardForm, state: e.target.value })}
              />
              <Input
                label="Pincode"
                placeholder="560001"
                value={onboardForm.pincode}
                onChange={(e) => setOnboardForm({ ...onboardForm, pincode: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="GSTIN (Optional)"
                placeholder="29AAAAA0000A1Z5"
                value={onboardForm.gstNumber}
                onChange={(e) => setOnboardForm({ ...onboardForm, gstNumber: e.target.value.toUpperCase() })}
              />
              <Input
                label="PAN Number (Optional)"
                placeholder="AAAAA0000A"
                value={onboardForm.panNumber}
                onChange={(e) => setOnboardForm({ ...onboardForm, panNumber: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              isLoading={onboardMutation.isPending}
              onClick={() => onboardMutation.mutate()}
            >
              Confirm Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Review Modal */}
      <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              KYC Verification Desk
            </DialogTitle>
            <DialogDescription>
              Review and approve or reject KYC documents for {selectedAgentForKyc?.businessName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAgentForKyc?.businessName}
                </p>
                <p className="text-[11px] text-slate-500">
                  Contact: {selectedAgentForKyc?.contactPersonName} • {selectedAgentForKyc?.phone}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedAgentForKyc?.status || '')}>
                {selectedAgentForKyc?.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Action Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setKycAction('APPROVE')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    kycAction === 'APPROVE'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve KYC
                </button>
                <button
                  type="button"
                  onClick={() => setKycAction('REJECT')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    kycAction === 'REJECT'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Reject KYC
                </button>
              </div>
            </div>

            {kycAction === 'REJECT' && (
              <Input
                label="Rejection Reason (Required)"
                placeholder="e.g. PAN document illegible, GST certificate expired"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                helperText="This reason will be displayed to the agent in their onboarding dashboard."
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKycModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={kycAction === 'APPROVE' ? 'gold' : 'destructive'}
              isLoading={kycMutation.isPending}
              onClick={() => kycMutation.mutate()}
            >
              {kycAction === 'APPROVE' ? 'Approve & Activate' : 'Reject KYC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        title={`Suspend Agency: ${selectedAgentForSuspend?.businessName}`}
        description="Suspending this agent will immediately freeze their wallet, revoke booking issuance capabilities, and log an audit security alert."
        confirmLabel="Suspend Agent"
        variant="destructive"
        isLoading={suspendMutation.isPending}
        onConfirm={() => suspendMutation.mutate()}
      >
        <Input
          label="Suspension Reason (Required for Compliance)"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
        />
      </ConfirmationDialog>

      {/* Reactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={reactivateModalOpen}
        onOpenChange={setReactivateModalOpen}
        title={`Reactivate Agency: ${selectedAgentForReactivate?.businessName}`}
        description="Reactivating this agent will unfreeze their wallet balance and restore booking capabilities."
        confirmLabel="Reactivate Agent"
        variant="gold"
        isLoading={reactivateMutation.isPending}
        onConfirm={() => reactivateMutation.mutate()}
      />
    </div>
  );
}
