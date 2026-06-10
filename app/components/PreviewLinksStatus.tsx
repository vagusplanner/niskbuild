"use client";

import { useEffect, useState } from 'react';

interface PreviewStatus {
  active: number;
  expired: number;
  subscriptionActive: boolean;
  restoreCount: number;
}

export default function PreviewLinksStatus({
  onRestoreNotice,
}: {
  onRestoreNotice?: (count: number) => void;
}) {
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/previews', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data.restoreCount > 0) {
          onRestoreNotice?.(data.restoreCount);
          fetch('/api/previews/ack-restore', { method: 'POST', credentials: 'include' });
        }
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [onRestoreNotice]);

  if (loading) return null;

  const isActive = status?.subscriptionActive && (status?.active ?? 0) > 0;
  const hasExpired = (status?.expired ?? 0) > 0;
  const dotColor = status?.subscriptionActive ? 'bg-[var(--success)]' : 'bg-[var(--error)]';
  const label = status?.subscriptionActive
    ? `${status?.active ?? 0} active preview link${(status?.active ?? 0) !== 1 ? 's' : ''}`
    : hasExpired
      ? `${status?.expired} expired preview link${(status?.expired ?? 0) !== 1 ? 's' : ''}`
      : 'No preview links yet';

  return (
    <div
      className="flex items-center gap-2 text-sm text-gray-300"
      title="Preview links are active while your subscription is active."
    >
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}
        aria-hidden
      />
      <span>{label}</span>
      {isActive && (
        <span className="text-[10px] text-nisk-muted hidden sm:inline">
          — active while subscribed
        </span>
      )}
    </div>
  );
}
