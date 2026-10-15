import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the backend. Please verify your connection or try again.',
  code,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">{title}</h3>
      <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/70 max-w-md leading-relaxed">
        {message}
      </p>
      {code && (
        <span className="mt-2 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
          Error Code: {code}
        </span>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onRetry}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
