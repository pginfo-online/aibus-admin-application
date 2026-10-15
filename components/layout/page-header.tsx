import React from 'react';
import { Breadcrumbs } from './breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2">
      {showBreadcrumbs && <Breadcrumbs />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
