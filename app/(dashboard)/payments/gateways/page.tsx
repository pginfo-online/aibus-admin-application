'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TableRowSkeleton, Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/store/toast-store';
import Link from 'next/link';
import {
  Cpu,
  RotateCcw,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { PaymentGatewayConfigItem, GatewayMetricsData, UpdateGatewayConfigInput } from '@/types/api';

export default function PaymentGatewaysPage() {
  const queryClient = useQueryClient();

  // Selected gateway for editing
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayConfigItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGatewayConfigInput>({
    isEnabled: true,
    isPrimary: false,
    mode: 'LIVE',
    trafficWeight: 100,
    priority: 1,
    supportedMethods: ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
  });

  // Query Gateways & Metrics
  const metricsQuery = useQuery({
    queryKey: ['admin', 'payment-gateways', 'metrics'],
    queryFn: async () => {
      const res = await apiClient.get<GatewayMetricsData>('/admin/payment-gateways/metrics');
      return res.data;
    },
    refetchInterval: 15000, // auto poll health every 15s
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ gateway, isEnabled }: { gateway: string; isEnabled: boolean }) => {
      return apiClient.post(`/admin/payment-gateways/${gateway.toLowerCase()}/toggle`, { isEnabled });
    },
    onSuccess: (_, vars) => {
      toast.success(`Gateway ${vars.gateway} ${vars.isEnabled ? 'enabled' : 'disabled'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-gateways'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to toggle gateway status');
    },
  });

  // Update Config Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ gateway, body }: { gateway: string; body: UpdateGatewayConfigInput }) => {
      return apiClient.patch(`/admin/payment-gateways/${gateway.toLowerCase()}`, body);
    },
    onSuccess: () => {
      toast.success('Payment gateway configuration updated successfully');
      setEditModalOpen(false);
      setSelectedGateway(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-gateways'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update gateway settings');
    },
  });

  const gateways = metricsQuery.data?.gateways || [];
  const aggregates = metricsQuery.data?.transactionAggregates || [];

  const handleOpenEdit = (gw: PaymentGatewayConfigItem) => {
    setSelectedGateway(gw);
    setEditForm({
      isEnabled: gw.isEnabled,
      isPrimary: gw.isPrimary,
      mode: (gw.mode as any) || 'LIVE',
      trafficWeight: gw.trafficWeight,
      priority: gw.priority,
      supportedMethods: gw.supportedMethods || ['UPI', 'CARD', 'NETBANKING'],
    });
    setEditModalOpen(true);
  };

  const togglePaymentMethod = (method: string) => {
    const current = editForm.supportedMethods || [];
    if (current.includes(method)) {
      setEditForm({ ...editForm, supportedMethods: current.filter((m) => m !== method) });
    } else {
      setEditForm({ ...editForm, supportedMethods: [...current, method] });
    }
  };

  // Compute aggregate stats per gateway
  const getGatewayStats = (gwName: string) => {
    const matching = aggregates.filter((a) => a.gateway.toUpperCase() === gwName.toUpperCase());
    const totalCount = matching.reduce((acc, curr) => acc + curr._count.id, 0);
    const successRow = matching.find((m) => m.status === 'SUCCESS');
    const successCount = successRow?._count.id || 0;
    const successVolume = successRow?._sum.amount || 0;
    const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '100';

    return { totalCount, successCount, successVolume, successRate };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2 text-xs">
        <Link href="/payments" className="text-slate-500 hover:text-amber-500">
          Payment Transactions
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-amber-500 font-semibold">Payment Gateway Orchestration</span>
      </div>

      <PageHeader
        title="Multi-Gateway Orchestration & Traffic Routing"
        description="Configure dynamic traffic splitting, circuit breaker health thresholds, and seamless failovers between Razorpay and PhonePe."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/payments">
              <Button variant="outline" size="sm">
                View All Transactions
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => metricsQuery.refetch()}
              isLoading={metricsQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {metricsQuery.isError && (
        <ErrorState
          title="Failed to load gateway orchestration status"
          message={metricsQuery.error?.message}
          onRetry={() => metricsQuery.refetch()}
        />
      )}

      {/* Real-time Gateway Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gateways.map((gw) => {
          const stats = getGatewayStats(gw.gateway);
          const isCircuitOpen = gw.isCircuitOpen || false;

          return (
            <Card
              key={gw.id}
              className={`p-5 relative overflow-hidden transition-all ${
                gw.isPrimary
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.03] to-slate-900/40'
                  : ''
              }`}
            >
              {/* Primary Ribbon */}
              {gw.isPrimary && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-bl-lg shadow-sm">
                  PRIMARY GATEWAY
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      gw.gateway === 'RAZORPAY'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    {gw.gateway.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {gw.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-400">{gw.gateway}</span>
                      <Badge variant={getStatusBadgeVariant(gw.mode)} size="sm">
                        {gw.mode}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant={gw.isEnabled ? 'success' : 'neutral'} size="sm">
                    {gw.isEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
              </div>

              {/* Circuit Breaker Status */}
              <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${isCircuitOpen ? 'text-rose-500' : 'text-emerald-500'}`} />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Circuit State:</span>
                  <span className={`font-bold ${isCircuitOpen ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {isCircuitOpen ? 'TRIPPED OPEN (Degraded)' : 'CLOSED (Healthy)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {gw.consecutiveFailures || 0} consecutive failures
                </div>
              </div>

              {/* Dynamic Traffic Allocation */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Smart Router Traffic Share
                  </span>
                  <span className="font-bold text-amber-500">{gw.trafficWeight}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all"
                    style={{ width: `${gw.trafficWeight}%` }}
                  />
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Settled Volume</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(stats.successVolume)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Success Rate</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {stats.successRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-400">Transactions</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {stats.totalCount} total
                  </p>
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div className="mt-4 flex flex-wrap gap-1">
                {(gw.supportedMethods || []).map((m) => (
                  <span
                    key={m}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    toggleMutation.mutate({ gateway: gw.gateway, isEnabled: !gw.isEnabled })
                  }
                  isLoading={toggleMutation.isPending && toggleMutation.variables?.gateway === gw.gateway}
                >
                  {gw.isEnabled ? 'Disable Gateway' : 'Enable Gateway'}
                </Button>

                <Button
                  variant="gold"
                  size="sm"
                  className="h-7 text-xs"
                  leftIcon={<Sliders className="h-3 w-3" />}
                  onClick={() => handleOpenEdit(gw)}
                >
                  Configure Routing
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Routing Architecture & Automatic Failover Explainer */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            AiBus Smart Router & Resilience Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-xs text-slate-600 dark:text-slate-300 space-y-3">
          <p>
            The AiBus backend orchestrator dynamically selects the best payment processor for customer and travel agent bookings using weighted probability routing and real-time circuit breakers:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] flex items-center justify-center font-black">
                  1
                </span>
                Method Affinity
              </span>
              <p className="text-slate-500">
                If a customer selects UPI Intent or NetBanking, the orchestrator directs traffic to the configured gateway supporting that rail with highest priority.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] flex items-center justify-center font-black">
                  2
                </span>
                Circuit Breaker
              </span>
              <p className="text-slate-500">
                If a gateway experiences 5 consecutive API errors or gateway timeouts, the circuit trips OPEN and all inbound traffic is instantly rerouted to the secondary adapter.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] flex items-center justify-center font-black">
                  3
                </span>
                Automated Failover
              </span>
              <p className="text-slate-500">
                Payment intents never fail silently; if Razorpay returns 503 or PhonePe encounters downtime, the reservation checkout fails over with zero seat loss.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configure Gateway Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-500" />
              Configure {selectedGateway?.name}
            </DialogTitle>
            <DialogDescription>
              Adjust live traffic weight, operating environment, and primary failover settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Operating Mode"
                value={editForm.mode}
                onChange={(e) => setEditForm({ ...editForm, mode: e.target.value as any })}
              >
                <option value="LIVE">LIVE (Production)</option>
                <option value="TEST">TEST / SANDBOX</option>
                <option value="MAINTENANCE">MAINTENANCE (No Traffic)</option>
              </Select>

              <Input
                label="Traffic Routing Weight (0-100%)"
                type="number"
                min={0}
                max={100}
                value={editForm.trafficWeight}
                onChange={(e) => setEditForm({ ...editForm, trafficWeight: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Processor Status
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <input
                  type="checkbox"
                  id="isPrimaryCheckbox"
                  checked={editForm.isPrimary}
                  onChange={(e) => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <label htmlFor="isPrimaryCheckbox" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Set as Default Primary Gateway
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supported Payment Rails
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['UPI', 'CARD', 'NETBANKING', 'WALLET'].map((method) => {
                  const isChecked = (editForm.supportedMethods || []).includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all ${
                        isChecked
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{method}</span>
                      {isChecked && <CheckCircle className="h-3.5 w-3.5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              isLoading={updateMutation.isPending}
              onClick={() => {
                if (selectedGateway) {
                  updateMutation.mutate({ gateway: selectedGateway.gateway, body: editForm });
                }
              }}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
