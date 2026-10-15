import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupees (INR) or specified currency.
 * Avoids floating point display errors.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'INR'
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format ISO datetime string to user-friendly readable date and time.
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  includeTime = true
): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        : {}),
    };
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return '—';
  }
}

/**
 * Format relative time (e.g. 5m ago, 2h ago).
 */
export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDateTime(dateInput, false);
  } catch {
    return '—';
  }
}

/**
 * Trigger browser file download from Blob or URL.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Truncate long IDs or strings with middle ellipsis.
 */
export function truncateId(id: string | null | undefined, start = 6, end = 4): string {
  if (!id) return '—';
  if (id.length <= start + end) return id;
  return `${id.slice(0, start)}…${id.slice(-end)}`;
}
