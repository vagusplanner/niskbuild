import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Informational-only notice for iOS native (Guideline 3.1.1).
 * No button, no link, no website, no purchase guidance — plain text only.
 */
export default function IosWebSubscriptionNotice({ className, compact = false }) {
  if (compact) {
    return (
      <p className={cn('text-xs text-slate-500 dark:text-slate-400 leading-snug', className)}>
        This is a premium feature.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3',
        className
      )}
      role="status"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        This is a premium feature.
      </p>
    </div>
  );
}
