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
import { Dialog } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from '@/store/toast-store';
import {
  Search,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  Calendar,
  Percent,
} from 'lucide-react';
import type { CouponListItem, PaginationMeta, CouponType, CouponStatus } from '@/types/api';

export default function CouponsListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'code' | 'usedCount' | 'validUntil'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [couponType, setCouponType] = useState<CouponType>('PERCENTAGE');
  const [value, setValue] = useState(10);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(150);
  const [minOrderValue, setMinOrderValue] = useState<number | undefined>(500);
  const [usageLimit, setUsageLimit] = useState<number | undefined>(1000);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('Festive discount for bus bookings');

  // Deactivate modal
  const [deactivateCoupon, setDeactivateCoupon] = useState<CouponListItem | null>(null);

  // Fetch Coupons
  const couponsQuery = useQuery({
    queryKey: ['admin', 'coupons', 'list', { page, limit, search, type, status, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<CouponListItem[]>('/admin/coupons', {
        page,
        limit,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Create Coupon Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/coupons', {
        code: code.toUpperCase().trim(),
        type: couponType,
        value: Number(value),
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
        description: description || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Coupon code published successfully');
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create coupon');
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/coupons/${id}`);
    },
    onSuccess: () => {
      toast.success('Coupon deactivated');
      setDeactivateCoupon(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to deactivate coupon');
    },
  });

  const openCreateModal = () => {
    const now = new Date();
    setCode(`SAVE${Math.floor(Math.random() * 90 + 10)}`);
    setCouponType('PERCENTAGE');
    setValue(15);
    setMaxDiscount(200);
    setMinOrderValue(400);
    setUsageLimit(500);
    setValidFrom(now.toISOString().slice(0, 16));
    setValidUntil(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setDescription('Limited period discount code');
    setCreateModalOpen(true);
  };

  const coupons = couponsQuery.data?.items || [];
  const pagination = couponsQuery.data?.pagination || {
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
        title="Promotions & Coupons"
        description="Configure promotional discounts, percentage markdowns, minimum order values, and redemption limits."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => couponsQuery.refetch()}
              isLoading={couponsQuery.isFetching}
            >
              Refresh
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
            >
              Create Coupon
            </Button>
          </div>
        }
      />

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search coupon code or description..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="FLAT">FLAT</option>
            <option value="CASHBACK">CASHBACK</option>
          </Select>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="EXHAUSTED">EXHAUSTED</option>
            <option value="DISABLED">DISABLED</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="code">Sort: Code</option>
            <option value="usedCount">Sort: Redemption Count</option>
            <option value="validUntil">Sort: Expiration Date</option>
          </Select>
        </div>
      </Card>

      {/* Coupons Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">Promo Code</th>
                <th className="p-3.5">Discount Benefit</th>
                <th className="p-3.5">Min Order / Cap</th>
                <th className="p-3.5 text-center">Redeemed</th>
                <th className="p-3.5">Validity Window</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {couponsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : couponsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load coupons"
                      message={couponsQuery.error?.message}
                      onRetry={() => couponsQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No coupons found"
                      description="No active promotions or discount codes match your filters."
                      actionLabel="Create Coupon"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                coupons.map((cp) => (
                  <tr
                    key={cp.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-amber-500 text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-amber-500" />
                      {cp.code}
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {cp.type === 'PERCENTAGE' ? `${cp.value}% OFF` : `${formatCurrency(cp.value)} FLAT`}
                      </span>
                      {cp.description && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {cp.description}
                        </p>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      <p>Min: {formatCurrency(cp.minOrderValue || 0)}</p>
                      {cp.maxDiscount && (
                        <p className="text-[10px] text-slate-400">Max Cap: {formatCurrency(cp.maxDiscount)}</p>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
                      {cp.usedCount}
                      {cp.usageLimit && (
                        <span className="text-[10px] font-normal text-slate-400">
                          {' '}/ {cp.usageLimit}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500">
                      <p>{formatDateTime(cp.validFrom, false)}</p>
                      <p className="text-[10px] text-slate-400">to {formatDateTime(cp.validUntil, false)}</p>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={getStatusBadgeVariant(cp.status)} size="sm">
                        {cp.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right">
                      {cp.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-600"
                          onClick={() => setDeactivateCoupon(cp)}
                          title="Deactivate coupon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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

      {/* Create Coupon Modal */}
      <Dialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="Launch Promotion / Coupon"
        description="Define discount code, limits, minimum booking threshold, and validity dates."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Coupon Code (Unique)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DIWALI2026"
            />
            <Select
              label="Discount Type"
              value={couponType}
              onChange={(e) => setCouponType(e.target.value as any)}
            >
              <option value="PERCENTAGE">PERCENTAGE (%)</option>
              <option value="FLAT">FLAT AMOUNT (₹)</option>
              <option value="CASHBACK">CASHBACK (Wallet)</option>
            </Select>
            <Input
              label={couponType === 'PERCENTAGE' ? 'Discount % (e.g. 15)' : 'Flat Amount (e.g. 100)'}
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Max Discount Cap (₹)"
              type="number"
              value={maxDiscount ?? ''}
              onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 250"
            />
            <Input
              label="Min Order Fare (₹)"
              type="number"
              value={minOrderValue ?? ''}
              onChange={(e) => setMinOrderValue(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 499"
            />
            <Input
              label="Max Total Redemptions"
              type="number"
              value={usageLimit ?? ''}
              onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 1000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
            <Input
              label="Valid Until"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <Input
            label="Promotional Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 15% off up to ₹250 on intercity buses"
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
              Publish Coupon
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      {deactivateCoupon && (
        <ConfirmationDialog
          open={!!deactivateCoupon}
          onOpenChange={(open) => !open && setDeactivateCoupon(null)}
          title={`Deactivate Coupon: ${deactivateCoupon.code}`}
          description="Deactivating this coupon will prevent any further redemptions during customer checkouts."
          confirmLabel="Deactivate Coupon"
          variant="destructive"
          isLoading={deactivateMutation.isPending}
          onConfirm={() => deactivateMutation.mutate(deactivateCoupon.id)}
        />
      )}
    </div>
  );
}
