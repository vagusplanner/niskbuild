'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { HeatmapDay } from '@/lib/shift-ai/analytics-shared';
import { SA } from '@/lib/shift-ai/theme';

const INTENSITY = [
  'bg-[var(--sa-navy-100)]',
  'bg-[var(--sa-navy-200)]',
  'bg-[var(--sa-navy-400)]',
  'bg-[var(--sa-navy-600)]',
  'bg-[var(--sa-navy-800)]',
];

function intensityClass(count: number, max: number): string {
  if (count === 0) return INTENSITY[0];
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return INTENSITY[1];
  if (ratio <= 0.5) return INTENSITY[2];
  if (ratio <= 0.75) return INTENSITY[3];
  return INTENSITY[4];
}

export default function ShiftAiMasteryHeatmapClient({
  heatmapDays,
  totalActivity,
  activeDays,
  embedded = false,
}: {
  heatmapDays: HeatmapDay[];
  totalActivity: number;
  activeDays: number;
  embedded?: boolean;
}) {
  const t = useTranslations('analytics.heatmap');
  const maxCount = useMemo(
    () => Math.max(...heatmapDays.map((d) => d.count), 1),
    [heatmapDays]
  );

  const weeks = useMemo(() => {
    const chunks: HeatmapDay[][] = [];
    for (let i = 0; i < heatmapDays.length; i += 7) {
      chunks.push(heatmapDays.slice(i, i + 7));
    }
    return chunks;
  }, [heatmapDays]);

  const heading = embedded ? (
    <div>
      <h2 className={`flex items-center gap-2 text-sm font-bold ${SA.text}`}>
        <span aria-hidden>🔥</span> {t('title')}
      </h2>
      <p className={`mt-1 text-sm ${SA.muted}`}>{t('subtitle')}</p>
    </div>
  ) : (
    <div>
      <h1 className={`${SA.headingMd} flex items-center gap-2`}>
        <span aria-hidden>🔥</span> {t('title')}
      </h1>
      <p className={`mt-1 text-sm ${SA.muted}`}>{t('subtitle')}</p>
    </div>
  );

  return (
    <div
      id="study-streak"
      className={`${embedded ? 'space-y-5' : `${SA.contentNarrow} space-y-5`}`}
    >
      {heading}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: t('totalActivities'), value: totalActivity },
          { label: t('activeDays'), value: activeDays },
          { label: t('weeksShown'), value: weeks.length },
        ].map((stat) => (
          <div key={stat.label} className={`${SA.cardPadded} text-center`}>
            <p className="text-2xl font-extrabold text-[var(--sa-navy-700)]">{stat.value}</p>
            <p className={`text-xs ${SA.muted}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className={`${SA.cardPadded} overflow-x-auto`}>
        <div dir="ltr" className="flex min-w-max gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={t('cellTitle', { date: day.date, count: day.count })}
                  className={`h-3 w-3 rounded-sm ${intensityClass(day.count, maxCount)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div dir="ltr" className="mt-4 flex items-center gap-2 text-xs">
          <span className={SA.muted}>{t('less')}</span>
          {INTENSITY.map((cls) => (
            <div key={cls} className={`h-3 w-3 rounded-sm ${cls}`} />
          ))}
          <span className={SA.muted}>{t('more')}</span>
        </div>
      </div>

      {totalActivity === 0 ? (
        <div className={`${SA.cardPadded} text-center`}>
          <p className={`text-sm ${SA.muted}`}>{t('empty')}</p>
        </div>
      ) : null}
    </div>
  );
}
