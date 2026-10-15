'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 dark:text-slate-400">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 mx-1.5 text-slate-400 dark:text-slate-600" />
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none">
                {title}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate max-w-[120px] sm:max-w-none"
              >
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
