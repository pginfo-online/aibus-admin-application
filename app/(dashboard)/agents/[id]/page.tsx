'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Briefcase,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Coins,
  Scale,
  Calendar,
} from 'lucide-react';
import type {
  AgentDetailsData,
  AgentKycDocumentItem,
  AgentBankAccountItem,
  AgentStaffItem,
  LedgerEntryItem,
} from '@/types/api';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const agentId = params.id as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'banks' | 'staff' | 'ledger'>('overview');

  // KYC Review State
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycAction, setKycAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectionReason, setRejectionReason] = useState('');

  // Suspend State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Regulatory compliance issue');

  // Reactivate State
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);

  // Credit Limit State
  const [creditLimitModalOpen, setCreditLimitModalOpen] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState<number>(0);

  // Fetch Agent Details
  const agentQuery = useQuery({
    queryKey: ['admin', 'agents', 'detail', agentId],
    queryFn: async () => {
      const res = await apiClient.get<AgentDetailsData>(`/admin/agents/${agentId}`);
      if (res.data?.wallet?.creditLimit !== undefined) {
        setNewCreditLimit(res.data.wallet.creditLimit);
      }
      return res.data;
    },
    enabled: !!agentId,
  });

  // Fetch Agent Ledger Entries (when ledger tab active)
  const ledgerQuery = useQuery({
    queryKey: ['admin', 'ledger', 'agent', agentId],
    queryFn: async () => {
      const res = await apiClient.get<{ entries: LedgerEntryItem[] }>('/admin/ledger/entries', {
        agentId,
        limit: 50,
      });
      return res.data?.entries || [];
    },
    enabled: activeTab === 'ledger',
  });

  // KYC Review Mutation
  const kycMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/agents/${agentId}/kyc-review`, {
        action: kycAction,
        rejectionReason: kycAction === 'REJECT' ? rejectionReason : undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Agent KYC review status updated: ${kycAction}`);
      setKycModalOpen(false);
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
      return apiClient.post(`/admin/agents/${agentId}/suspend`, {
        reason: suspendReason,
      });
    },
    onSuccess: () => {
      toast.success('Agent suspended and wallet frozen');
      setSuspendModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suspend agent');
    },
  });

  // Reactivate Agent Mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/admin/agents/${agentId}/reactivate`);
    },
    onSuccess: () => {
      toast.success('Agent reactivated and wallet unfrozen');
      setReactivateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reactivate agent');
    },
  });

  // Update Credit Limit Mutation
  const creditLimitMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/admin/agents/${agentId}/credit-limit`, {
        creditLimit: Number(newCreditLimit),
      });
    },
    onSuccess: () => {
      toast.success('Agent credit limit updated successfully');
      setCreditLimitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update credit limit');
    },
  });

  const a = agentQuery.data;

  if (agentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (agentQuery.isError || !a) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/agents')}
        >
          Back to Agents Directory
        </Button>
        <ErrorState
          title="Partner Agency Not Found"
          message={agentQuery.error?.message || 'Could not locate the requested B2B agent profile.'}
          onRetry={() => agentQuery.refetch()}
        />
      </div>
    );
  }

  const creditUsedPct = a.wallet?.creditLimit
    ? Math.min(100, Math.round(((a.wallet.creditUsed || 0) / a.wallet.creditLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/agents')}
        >
          Partner Agents
        </Button>
      </div>

      <PageHeader
        title={a.businessName}
        description={`Agent ID: ${a.id} • Registered ${formatDateTime(a.createdAt)}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(a.status)} size="md">
              {a.status.replace(/_/g, ' ')}
            </Badge>
            {a.wallet?.isFrozen && (
              <Badge variant="destructive" size="md">
                WALLET FROZEN
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Coins className="h-3.5 w-3.5" />}
              onClick={() => {
                setNewCreditLimit(a.wallet?.creditLimit || 0);
                setCreditLimitModalOpen(true);
              }}
            >
              Set Credit Limit
            </Button>

            {['KYC_SUBMITTED', 'UNDER_REVIEW', 'PENDING_KYC', 'REJECTED'].includes(a.status) && (
              <Button
                variant="gold"
                size="sm"
                leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                onClick={() => {
                  setKycAction('APPROVE');
                  setKycModalOpen(true);
                }}
              >
                Review KYC Documents
              </Button>
            )}

            {a.status === 'SUSPENDED' ? (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => setReactivateModalOpen(true)}
              >
                Reactivate Agency
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                leftIcon={<ShieldAlert className="h-3.5 w-3.5" />}
                onClick={() => setSuspendModalOpen(true)}
              >
                Suspend Agency
              </Button>
            )}
          </div>
        }
      />

      {/* Frozen Alert Banner */}
      {a.wallet?.isFrozen && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Agency Account Suspended & Wallet Frozen</h4>
            <p className="text-xs mt-1">
              Reason: <span className="font-semibold">{a.suspendedReason || a.wallet.frozenReason || 'Compliance suspension'}</span>
            </p>
            {a.suspendedAt && (
              <p className="text-[11px] text-rose-700/70 dark:text-rose-300/70 mt-0.5">
                Enforced on {formatDateTime(a.suspendedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'overview'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Agency Overview & Wallet
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'kyc'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          KYC Documents ({a.kycDocuments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'banks'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Settlement Bank Accounts ({a.bankAccounts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative ${
            activeTab === 'staff'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Staff & Team ({a.staff?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 font-semibold px-2 cursor-pointer transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'text-amber-500 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          Financial Ledger
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agency Profile */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-500" />
                Agency Registration & Tax Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Business / Trade Name</p>
                  <p className="text-slate-900 dark:text-slate-100 font-bold mt-0.5">{a.businessName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Primary Contact Person</p>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">{a.contactPersonName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Business Email</p>
                  <p className="text-slate-900 dark:text-slate-100 font-mono mt-0.5">{a.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Phone Number</p>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold mt-0.5">{a.phone}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <p className="text-slate-400 font-medium">Physical Business Address</p>
                <p className="text-slate-800 dark:text-slate-200 mt-1">
                  {a.businessAddress}, {a.city}, {a.state} {a.pincode ? `- ${a.pincode}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">GST Identification Number (GSTIN)</p>
                  <p className="text-slate-900 dark:text-slate-100 font-mono font-semibold mt-0.5">
                    {a.gstNumber || 'Not Provided / Unregistered'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Permanent Account Number (PAN)</p>
                  <p className="text-slate-900 dark:text-slate-100 font-mono font-semibold mt-0.5">
                    {a.panNumber || 'Not Provided'}
                  </p>
                </div>
              </div>

              {a.approvedAt && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Approved by compliance on {formatDateTime(a.approvedAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Summary */}
          <div className="space-y-4">
            <Card className="p-4 border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Cash Balance
                </span>
                <Wallet className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(a.wallet?.cashBalance || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Pre-funded liquidity for ticket booking</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Credit Limit
                </span>
                <Coins className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(a.wallet?.creditLimit || 0)}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Used: {formatCurrency(a.wallet?.creditUsed || 0)}</span>
                  <span>{creditUsedPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${creditUsedPct}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Top-ups</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(a.wallet?.totalTopups || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Ticket Spending</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(a.wallet?.totalSpent || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Commissions Earned</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(a.wallet?.totalCommission || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Total Bookings Count</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {a._count?.bookings || 0}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: KYC Documents Desk */}
      {activeTab === 'kyc' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm">Submitted KYC Identity & Compliance Documents</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect regulatory proof of identity, GST certificates, and banking credentials.
              </p>
            </div>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
              onClick={() => {
                setKycAction('APPROVE');
                setKycModalOpen(true);
              }}
            >
              Verify All Documents
            </Button>
          </CardHeader>
          <CardContent>
            {!a.kycDocuments || a.kycDocuments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No KYC documents have been uploaded by this agent yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {a.kycDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {doc.docType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {doc.verifiedAt ? (
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      ) : doc.rejectedAt ? (
                        <Badge variant="destructive" size="sm">
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Pending Review
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1">
                      <p className="font-mono truncate">Storage Key: {doc.storageKey}</p>
                      <p>Uploaded: {formatDateTime(doc.createdAt)}</p>
                      {doc.verifiedAt && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Verified on {formatDateTime(doc.verifiedAt)}
                        </p>
                      )}
                      {doc.rejectReason && (
                        <p className="text-rose-500 font-medium">
                          Rejection note: {doc.rejectReason}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex justify-end">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 font-semibold"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Inspect Document
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Bank Accounts */}
      {activeTab === 'banks' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked Settlement Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {!a.bankAccounts || a.bankAccounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No bank accounts registered.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {a.bankAccounts.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {b.bankName}
                        </span>
                        {b.isPrimary && (
                          <Badge variant="gold" size="sm">
                            Primary Account
                          </Badge>
                        )}
                        {b.isVerified ? (
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Holder: <span className="font-medium text-slate-900 dark:text-slate-200">{b.accountHolderName}</span> • A/C: <span className="font-mono">{b.accountNumber}</span> • IFSC: <span className="font-mono">{b.ifscCode}</span>
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      Added {formatDateTime(b.createdAt, false)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Staff & RBAC */}
      {activeTab === 'staff' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agency Staff & Delegated Members</CardTitle>
          </CardHeader>
          <CardContent>
            {!a.staff || a.staff.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No staff members associated.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {a.staff.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.user?.fullName || `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim() || s.user?.email}
                        </span>
                        <Badge variant={s.role === 'OWNER' ? 'gold' : 'neutral'} size="sm">
                          {s.role}
                        </Badge>
                        <Badge variant={s.isActive ? 'success' : 'destructive'} size="sm">
                          {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {s.user?.email} {s.user?.phone ? `• ${s.user?.phone}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      Joined {formatDateTime(s.joinedAt || s.invitedAt, false)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Financial Ledger */}
      {activeTab === 'ledger' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Immutable Financial Ledger Entries</CardTitle>
            <Link href={`/ledger?agentId=${a.id}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Open Full Ledger
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ledgerQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !ledgerQuery.data || ledgerQuery.data.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No ledger transactions recorded for this partner agent.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      <th className="p-3">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Debit</th>
                      <th className="p-3 text-right">Credit</th>
                      <th className="p-3">Posted Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledgerQuery.data.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(entry.type)} size="sm">
                            {entry.type.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '—'}
                        </td>
                        <td className="p-3 text-slate-500">
                          {formatDateTime(entry.postedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Limit Modal */}
      <Dialog open={creditLimitModalOpen} onOpenChange={setCreditLimitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Update Agency Credit Line
            </DialogTitle>
            <DialogDescription>
              Set maximum overdraft allowance for ticket reservations. Max: ₹1,00,00,000.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <Input
              label="Approved Credit Limit (INR) *"
              type="number"
              min={0}
              max={10000000}
              value={newCreditLimit}
              onChange={(e) => setNewCreditLimit(Number(e.target.value))}
              helperText="Agent can reserve tickets up to this limit before cash top-up is mandatory."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditLimitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              isLoading={creditLimitMutation.isPending}
              onClick={() => creditLimitMutation.mutate()}
            >
              Update Credit Line
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
              Record approval or rejection decision for {a.businessName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Decision
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
                  <CheckCircle2 className="h-4 w-4" />
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
                placeholder="e.g. Identity documents illegible or unverified"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                helperText="This reason will be displayed to the agency."
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
        title={`Suspend Agency: ${a.businessName}`}
        description="Are you sure you want to suspend this agency? All booking permissions and wallet operations will be frozen."
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
        title={`Reactivate Agency: ${a.businessName}`}
        description="Reactivating this agent will unfreeze their wallet balance and restore ticketing capabilities."
        confirmLabel="Reactivate Agent"
        variant="gold"
        isLoading={reactivateMutation.isPending}
        onConfirm={() => reactivateMutation.mutate()}
      />
    </div>
  );
}
