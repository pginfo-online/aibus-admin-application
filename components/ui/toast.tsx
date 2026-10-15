'use client';

import React from 'react';
import { useToastStore, ToastItem } from '@/store/toast-store';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />,
  };

  const borderVariants = {
    success: 'border-emerald-500/30 bg-white dark:bg-slate-900',
    error: 'border-rose-500/30 bg-white dark:bg-slate-900',
    warning: 'border-amber-500/30 bg-white dark:bg-slate-900',
    info: 'border-sky-500/30 bg-white dark:bg-slate-900',
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl transition-all animate-in slide-in-from-bottom-2 duration-200',
        borderVariants[toast.variant]
      )}
    >
      {icons[toast.variant]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
