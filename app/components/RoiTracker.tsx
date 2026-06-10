"use client";

import { useEffect, useState } from 'react';
import {
  ROI_UPDATE_EVENT,
  calculateLocalSavingsUsd,
  getDailyRoiStats,
  type DailyRoiStats,
} from '@/lib/roi-tracker';

interface RoiTrackerProps {
  userId?: string;
}

export default function RoiTracker({ userId }: RoiTrackerProps) {
  const [stats, setStats] = useState<DailyRoiStats | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const refresh = () => setStats(getDailyRoiStats(userId));
    refresh();

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.userId || detail.userId === userId) refresh();
    };

    window.addEventListener(ROI_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(ROI_UPDATE_EVENT, onUpdate);
  }, [userId]);

  if (!userId || !stats) return null;

  const savings = calculateLocalSavingsUsd(stats.localTokens);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="mx-2 mb-2 w-[calc(100%-1rem)] text-left px-2 py-1.5 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 text-[10px] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
      >
        💰 ROI · ${savings.toFixed(2)} saved today
      </button>
    );
  }

  return (
    <div className="mx-2 mb-2 p-3 rounded-lg border border-[var(--accent-cyan)]/25 bg-nisk-surface/80">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] font-semibold">
          ROI Tracker
        </p>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[10px] text-nisk-muted hover:text-white"
          aria-label="Collapse ROI tracker"
        >
          −
        </button>
      </div>

      {stats.localTokens > 0 ? (
        <p className="text-[11px] text-gray-200 leading-relaxed">
          Your device processed{' '}
          <span className="text-white font-semibold">{stats.localTokens.toLocaleString()}</span>{' '}
          tokens locally today, saving{' '}
          <span className="text-[var(--success)] font-semibold">${savings.toFixed(2)}</span> vs
          standard cloud-only platforms.
        </p>
      ) : (
        <p className="text-[11px] text-nisk-muted leading-relaxed">
          Edit code or run local preview work — savings vs cloud-only builders show up here.
        </p>
      )}

      <div className="mt-2 pt-2 border-t border-nisk grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-nisk-muted">
        <span>Local ops: {stats.localOps}</span>
        <span>Cloud ops: {stats.cloudOps}</span>
        <span>Cloud tokens: {stats.cloudTokens.toLocaleString()}</span>
        <span>Credits used: {stats.creditsUsed}</span>
      </div>
    </div>
  );
}
