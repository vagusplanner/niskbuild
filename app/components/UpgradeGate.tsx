"use client";

import Link from 'next/link';
import { tierAtLeast, type TierSlug } from '@/lib/tier-rank';
import { tierDisplayName } from '@/lib/tier-config';

type UpgradeGateProps = {
  featureName: string;
  headline: string;
  body: string;
  requiredTier: TierSlug;
  currentTier: string;
  subscriptionStatus?: string;
  children?: React.ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function UpgradeGate({
  featureName,
  headline,
  body,
  requiredTier,
  currentTier,
  subscriptionStatus = 'inactive',
  children,
  secondaryHref = '/pricing',
  secondaryLabel = "See what's included",
}: UpgradeGateProps) {
  const paid = subscriptionStatus === 'active';
  const entitled = paid && tierAtLeast(currentTier || 'free', requiredTier);

  if (entitled) {
    return <>{children}</>;
  }

  const requiredLabel = tierDisplayName(requiredTier);

  return (
    <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden">
      {children ? (
        <div
          className="blur-sm pointer-events-none select-none opacity-50 p-6 md:p-8"
          aria-hidden
        >
          {children}
        </div>
      ) : null}

      <div
        className={
          children
            ? 'absolute inset-0 flex items-center justify-center p-6 bg-[var(--code-bg)]/80 backdrop-blur-[2px]'
            : 'p-6 md:p-8 bg-[var(--code-bg)]'
        }
      >
        <div className="max-w-md w-full text-center">
          <div className="w-11 h-11 mx-auto mb-4 rounded-xl border-2 border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 flex items-center justify-center text-lg">
            🔒
          </div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--copper-melt)] font-semibold mb-2">
            {featureName}
          </p>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">{headline}</h2>
          <p className="text-sm text-nisk-muted leading-relaxed mb-6">{body}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/pricing"
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              Upgrade to {requiredLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="btn-secondary px-5 py-2.5 rounded-xl text-sm"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
