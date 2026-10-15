import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'destructive' | 'info' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    destructive:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    info:
      'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
    gold:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold',
    neutral:
      'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-medium tracking-wide',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full capitalize select-none leading-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Status helper mapping backend enums to appropriate badge variants
 */
export function getStatusBadgeVariant(status: string): BadgeProps['variant'] {
  const upper = (status || '').toUpperCase();
  if (['CONFIRMED', 'ACTIVE', 'SUCCESS', 'COMPLETED', 'RESOLVED', 'SENT', 'ONLINE', 'APPROVED', 'MATCHED', 'LIVE'].includes(upper)) {
    return 'success';
  }
  if (
    [
      'PENDING',
      'HELD',
      'PROCESSING',
      'OPEN',
      'IN_PROGRESS',
      'AWAITING_CUSTOMER',
      'PENDING_REVIEW',
      'REFUND_PENDING',
      'PENDING_KYC',
      'KYC_SUBMITTED',
      'UNDER_REVIEW',
      'PAYMENT_PENDING',
      'TEST',
      'SANDBOX',
    ].includes(upper)
  ) {
    return 'warning';
  }
  if (
    [
      'CANCELLED',
      'FAILED',
      'SUSPENDED',
      'DEACTIVATED',
      'EXPIRED',
      'EXHAUSTED',
      'DISABLED',
      'OFFLINE',
      'REJECTED',
      'DISCREPANCY_DETECTED',
      'CIRCUIT_OPEN',
      'MAINTENANCE',
    ].includes(upper)
  ) {
    return 'destructive';
  }
  if (['ESCALATED', 'SUPER_ADMIN', 'ADMIN', 'OWNER', 'MANAGER', 'COMMISSION_CREDIT'].includes(upper)) {
    return 'gold';
  }
  if (['RECONCILED', 'REFUNDED', 'AGENT_WALLET_TOPUP', 'AGENT_WALLET_CREDIT'].includes(upper)) {
    return 'info';
  }
  return 'neutral';
}
