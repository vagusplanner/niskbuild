"use client";

import { useState } from 'react';
import { DEMOGRAPHIC_OPTIONS, type DemographicTier } from '@/lib/demographic-tiers';

interface DemographicOnboardingProps {
  open: boolean;
  onComplete: (tier: DemographicTier) => void;
}

export default function DemographicOnboarding({ open, onComplete }: DemographicOnboardingProps) {
  const [selected, setSelected] = useState<DemographicTier | ''>('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const tier = (selected || 'unspecified') as DemographicTier;
    setSaving(true);
    try {
      await fetch('/api/settings/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demographicTier: tier }),
      });
    } catch {
      // Non-blocking — user can set later in settings
    } finally {
      setSaving(false);
      onComplete(tier);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-6 shadow-2xl">
        <p className="text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] mb-2">
          Privacy-first · Optional
        </p>
        <h2 className="text-xl font-bold text-white mb-2">Help us understand build trends</h2>
        <p className="text-sm text-nisk-muted mb-5">
          Select an age bracket for <strong className="text-gray-300">anonymous</strong> market
          research. We never store your name, email, or exact location in analytics — only macro
          software trends.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {DEMOGRAPHIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={`px-3 py-2.5 rounded-xl text-sm border transition-all ${
                selected === opt.value
                  ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-white'
                  : 'border-nisk text-gray-400 hover:border-[var(--primary)]/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onComplete('unspecified')}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
