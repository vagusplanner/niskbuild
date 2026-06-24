import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LazyLoadWrapper({ children, fallback, className }) {
  const defaultFallback = (
    <div className={cn(
      "flex items-center justify-center p-8",
      className
    )}>
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

// Skeleton loader components
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-5/6" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}