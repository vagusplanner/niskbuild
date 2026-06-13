"use client";

import { useEffect, useState } from 'react';

type RevenueData = {
  configured: boolean;
  currency?: string;
  todayRevenue?: number;
  totalRevenue?: number;
  availableBalance?: number;
  recentTransactions?: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string;
    created: string;
    paid: boolean;
  }>;
  message?: string;
  error?: string;
};

export default function StripeRevenueWidget({ projectId }: { projectId: string }) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/integrations/stripe/revenue?projectId=${projectId}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ configured: false, error: 'Failed to load' }))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-surface p-3 text-xs text-nisk-muted">
        Loading Stripe revenue…
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-surface p-3">
        <p className="text-xs font-medium text-white mb-1">📈 Stripe Revenue</p>
        <p className="text-[10px] text-nisk-muted">
          {data?.message || 'Connect Stripe with a secret key to see live revenue.'}
        </p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-3">
        <p className="text-xs text-[var(--error)]">{data.error}</p>
      </div>
    );
  }

  const sym =
    data.currency === 'GBP' ? '£' : data.currency === 'EUR' ? '€' : '$';

  return (
    <div className="rounded-xl border border-nisk bg-nisk-surface p-3 space-y-3">
      <p className="text-xs font-semibold text-white">📈 Stripe Revenue</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-nisk p-2">
          <p className="text-[10px] text-nisk-muted">Today</p>
          <p className="text-sm font-semibold text-[var(--success)]">
            {sym}{(data.todayRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-nisk p-2">
          <p className="text-[10px] text-nisk-muted">Recent</p>
          <p className="text-sm font-semibold text-white">
            {sym}{(data.totalRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-nisk p-2">
          <p className="text-[10px] text-nisk-muted">Balance</p>
          <p className="text-sm font-semibold text-[var(--accent-cyan)]">
            {sym}{(data.availableBalance ?? 0).toFixed(2)}
          </p>
        </div>
      </div>
      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <ul className="space-y-1">
          {data.recentTransactions.slice(0, 3).map((tx) => (
            <li
              key={tx.id}
              className="flex justify-between text-[10px] text-nisk-muted border-t border-nisk pt-1"
            >
              <span className="truncate pr-2">{tx.description}</span>
              <span className="text-white shrink-0">
                {sym}{tx.amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
