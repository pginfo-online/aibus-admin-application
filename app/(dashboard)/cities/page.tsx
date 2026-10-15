'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from '@/store/toast-store';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import type { CityListItem, PaginationMeta } from '@/types/api';

export default function CitiesListPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [active, setActive] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'state' | 'createdAt' | 'active'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityListItem | null>(null);
  const [cityName, setCityName] = useState('');
  const [cityState, setCityState] = useState('');
  const [providerCityId, setProviderCityId] = useState<string>('');
  const [aliases, setAliases] = useState('');
  const [cityActive, setCityActive] = useState(true);

  // Deactivate modal
  const [deactivateCity, setDeactivateCity] = useState<CityListItem | null>(null);

  // Fetch Cities
  const citiesQuery = useQuery({
    queryKey: ['admin', 'cities', 'list', { page, limit, search, state, active, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await apiClient.get<CityListItem[]>('/admin/cities', {
        page,
        limit,
        search: search || undefined,
        state: state || undefined,
        active: active ? active === 'true' : undefined,
        sortBy,
        sortOrder,
      });
      return {
        items: res.data || [],
        pagination: res.meta?.pagination as PaginationMeta,
      };
    },
  });

  // Save City Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedAliases = aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        name: cityName,
        state: cityState || undefined,
        providerCityId: providerCityId ? parseInt(providerCityId, 10) : undefined,
        aliases: parsedAliases,
        active: cityActive,
      };

      if (editingCity) {
        return apiClient.patch(`/admin/cities/${editingCity.id}`, payload);
      } else {
        return apiClient.post('/admin/cities', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingCity ? 'City updated successfully' : 'City created successfully');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save city');
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/cities/${id}`);
    },
    onSuccess: () => {
      toast.success('City deactivated');
      setDeactivateCity(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to deactivate city');
    },
  });

  // GDS Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/cities/sync');
    },
    onSuccess: (res: any) => {
      toast.success(res.message || 'GDS City Catalog synchronized successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'GDS City Sync failed');
    },
  });

  const openCreateModal = () => {
    setEditingCity(null);
    setCityName('');
    setCityState('');
    setProviderCityId('');
    setAliases('');
    setCityActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: CityListItem) => {
    setEditingCity(c);
    setCityName(c.name);
    setCityState(c.state || '');
    setProviderCityId(c.providerCityId ? String(c.providerCityId) : '');
    setAliases(c.aliases?.join(', ') || '');
    setCityActive(c.active);
    setModalOpen(true);
  };

  const cities = citiesQuery.data?.items || [];
  const pagination = citiesQuery.data?.pagination || {
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
        title="Cities Master Catalog"
        description="Maintain searchable stations and bus terminals, map GDS provider IDs, and trigger GDS Mantis sync."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              isLoading={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              Sync from GDS
            </Button>
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
            >
              Add City
            </Button>
          </div>
        }
      />

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search city name or aliases..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Input
            placeholder="Filter by state..."
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name">Sort: Name</option>
            <option value="state">Sort: State</option>
            <option value="createdAt">Sort: Created Date</option>
            <option value="active">Sort: Active Status</option>
          </Select>

          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="asc">Order: Ascending</option>
            <option value="desc">Order: Descending</option>
          </Select>
        </div>
      </Card>

      {/* Cities Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="p-3.5">City Name</th>
                <th className="p-3.5">State</th>
                <th className="p-3.5">GDS Provider ID</th>
                <th className="p-3.5">Aliases</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {citiesQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
              ) : citiesQuery.isError ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <ErrorState
                      title="Failed to load cities"
                      message={citiesQuery.error?.message}
                      onRetry={() => citiesQuery.refetch()}
                    />
                  </td>
                </tr>
              ) : cities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      title="No cities found"
                      description="No city entries found matching criteria."
                      actionLabel="Add City"
                      onAction={openCreateModal}
                    />
                  </td>
                </tr>
              ) : (
                cities.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {c.name}
                    </td>

                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {c.state || '—'}
                    </td>

                    <td className="p-3.5 font-mono text-slate-500">
                      {c.providerCityId ? `${c.providerCityId} (${c.providerName})` : '—'}
                    </td>

                    <td className="p-3.5 text-slate-500 truncate max-w-[200px]">
                      {c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : '—'}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant={c.active ? 'success' : 'destructive'} size="sm">
                        {c.active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-slate-500">
                      {formatDateTime(c.createdAt, false)}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          onClick={() => openEditModal(c)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {c.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-600"
                            onClick={() => setDeactivateCity(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create / Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingCity ? `Edit City: ${editingCity.name}` : 'Create New City'}
        description="Configure station name, state, and provider mapping."
      >
        <div className="space-y-4">
          <Input
            label="City Name (Required)"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="e.g. Bangalore"
          />

          <Input
            label="State / Province"
            value={cityState}
            onChange={(e) => setCityState(e.target.value)}
            placeholder="e.g. Karnataka"
          />

          <Input
            label="GDS Provider City ID (Numeric)"
            type="number"
            value={providerCityId}
            onChange={(e) => setProviderCityId(e.target.value)}
            placeholder="e.g. 1024"
          />

          <Input
            label="Search Aliases (Comma-separated)"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="e.g. Bengaluru, BLR"
          />

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={cityActive}
              onChange={(e) => setCityActive(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
            />
            <span>Active in search and booking routes</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editingCity ? 'Update City' : 'Create City'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      {deactivateCity && (
        <ConfirmationDialog
          open={!!deactivateCity}
          onOpenChange={(open) => !open && setDeactivateCity(null)}
          title={`Deactivate City: ${deactivateCity.name}`}
          description="Deactivating this city will suppress it from customer searches and route planning."
          confirmLabel="Deactivate City"
          variant="destructive"
          isLoading={deactivateMutation.isPending}
          onConfirm={() => deactivateMutation.mutate(deactivateCity.id)}
        />
      )}
    </div>
  );
}
