import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import {
  HEALTH_AI_DISCLAIMER,
  HEALTH_AI_SOURCES,
  resolveHealthAiSources,
} from '@/lib/health-ai-sources';
import { cn } from '@/lib/utils';

/**
 * Static not-medical-advice disclaimer + fixed allowlist links (NHS/CDC/Mayo/NIH).
 * Never depends on LLM-invented URLs.
 *
 * @param {'full' | 'disclaimer' | 'sources'} [variant]
 */
export default function HealthAiSourcesDisclaimer({
  sourceIds,
  className,
  compact = false,
  variant = 'full',
}) {
  const sources = resolveHealthAiSources(sourceIds);
  const showDisclaimer = variant === 'full' || variant === 'disclaimer';
  const showSources = variant === 'full' || variant === 'sources';

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40',
        compact ? 'p-2.5' : 'p-3',
        className
      )}
      role="note"
      aria-label="Health AI disclaimer and sources"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className={cn(
            'text-amber-700 dark:text-amber-400 shrink-0 mt-0.5',
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
          )}
        />
        <div className="min-w-0 space-y-2">
          {showDisclaimer && (
            <p
              className={cn(
                'text-amber-900 dark:text-amber-100 leading-relaxed font-medium',
                compact ? 'text-[10px]' : 'text-xs'
              )}
            >
              {HEALTH_AI_DISCLAIMER}
            </p>
          )}
          {showSources && (
            <div>
              <p
                className={cn(
                  'font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide',
                  compact ? 'text-[9px] mb-1' : 'text-[10px] mb-1.5'
                )}
              >
                Sources &amp; Disclaimer
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {(sources.length ? sources : HEALTH_AI_SOURCES).map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors',
                        compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
                      )}
                    >
                      {s.shortName}
                      <ExternalLink className="w-3 h-3 opacity-60" aria-hidden />
                      <span className="sr-only"> (opens {s.name})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
