'use client';

import { Lock, X } from 'lucide-react';
import ShiftAiSubscribePanel from '@/app/components/shift-ai/ShiftAiSubscribePanel';
import { SA } from '@/lib/shift-ai/theme';

type Props = {
  open: boolean;
  onClose: () => void;
  feature?: string;
};

/**
 * In-app paywall when a premium mutate route returns 402.
 * Enforcement stays on the API; this is UX only.
 */
export default function ShiftAiUpgradeGate({
  open,
  onClose,
  feature = 'This feature',
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="se8-upgrade-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--sa-navy-800)] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 id="se8-upgrade-title" className={`text-lg font-bold ${SA.text}`}>
              Upgrade to continue
            </h2>
            <p className={`mt-1 text-sm ${SA.muted}`}>
              {feature} needs an active Student or Family plan (or trial). Subscribe below to keep
              learning without interruption.
            </p>
          </div>
        </div>

        <ShiftAiSubscribePanel compact defaultPlan="student" />
      </div>
    </div>
  );
}
