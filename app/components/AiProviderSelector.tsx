"use client";

import { useState } from 'react';
import {
  canUseLocalOllama,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';

export type AiProviderChoice = 'local' | 'cloud';

type AiProviderSelectorProps = {
  tier: string;
  status: string;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
  onUpgrade: () => void;
};

export default function AiProviderSelector({
  tier,
  status,
  useLocalOllama,
  onUseLocalOllamaChange,
  onUpgrade,
}: AiProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const sandbox = isSandboxTier(tier);
  const paid = isPaidAndActive(tier, status);
  const canLocal = canUseLocalOllama(tier);

  const active: AiProviderChoice =
    sandbox || (useLocalOllama && canLocal) ? 'local' : 'cloud';

  const options: {
    id: AiProviderChoice;
    label: string;
    sub: string;
    locked: boolean;
    lockReason?: string;
  }[] = [
    {
      id: 'local',
      label: 'Local Ollama',
      sub: 'Private · localhost',
      locked: !canLocal && !sandbox,
      lockReason: 'Agency plan',
    },
    {
      id: 'cloud',
      label: paid ? 'Cloud AI' : 'Cloud AI (Groq)',
      sub: paid ? 'Self-heal + credits' : 'Pro plan required',
      locked: !paid && !sandbox,
      lockReason: 'Pro plan',
    },
  ];

  const activeLabel = options.find((o) => o.id === active)?.label ?? 'Cloud AI';

  const select = (id: AiProviderChoice) => {
    const opt = options.find((o) => o.id === id);
    if (opt?.locked) {
      onUpgrade();
      setOpen(false);
      return;
    }
    if (id === 'local') onUseLocalOllamaChange(true);
    else onUseLocalOllamaChange(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-nisk bg-nisk text-[10px] text-gray-300 hover:border-[var(--accent-cyan)]/50 transition-colors"
        aria-expanded={open}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
        <span className="font-medium text-white">{activeLabel}</span>
        <span className="opacity-60">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 bottom-full mb-1 w-52 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-50 py-1 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => select(opt.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-[var(--surface-elevated)] transition-colors ${
                  active === opt.id ? 'bg-[var(--accent-cyan)]/10' : ''
                }`}
              >
                <p className="text-xs font-medium text-white flex items-center gap-2">
                  {opt.label}
                  {opt.locked && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--secondary)]/20 text-[var(--secondary)]">
                      🔒 {opt.lockReason}
                    </span>
                  )}
                  {active === opt.id && !opt.locked && (
                    <span className="text-[var(--accent-cyan)]">✓</span>
                  )}
                </p>
                <p className="text-[10px] text-nisk-muted mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
