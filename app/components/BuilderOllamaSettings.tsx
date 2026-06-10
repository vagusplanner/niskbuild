"use client";

import Link from 'next/link';
import {
  canUseLocalOllama,
  LOCAL_OLLAMA_UPGRADE_CTA,
} from '@/lib/tier-config';

interface BuilderOllamaSettingsProps {
  tier: string;
  useLocalOllama: boolean;
  onUseLocalOllamaChange: (enabled: boolean) => void;
}

export default function BuilderOllamaSettings({
  tier,
  useLocalOllama,
  onUseLocalOllamaChange,
}: BuilderOllamaSettingsProps) {
  if (!canUseLocalOllama(tier)) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-nisk p-2">
      <p className="text-[9px] uppercase tracking-wider text-nisk-muted mb-1.5 px-1">Engine</p>
      <label className="flex items-start gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-[var(--surface-elevated)]">
        <input
          type="checkbox"
          checked={useLocalOllama}
          onChange={(e) => onUseLocalOllamaChange(e.target.checked)}
          className="mt-0.5 rounded border-nisk"
        />
        <span className="text-[10px] leading-snug text-gray-300">
          Connect Local Ollama
          <span className="block text-nisk-muted mt-0.5">Routes builds to localhost:11434</span>
        </span>
      </label>
    </div>
  );
}

/** Shown in settings when tier is free or pro */
export function LocalOllamaLockedCard({ tier }: { tier: string }) {
  if (canUseLocalOllama(tier)) return null;

  return (
    <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 opacity-60" aria-hidden>
          🔒
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Local AI (Ollama)</h2>
          <p className="text-sm text-nisk-muted mb-3">{LOCAL_OLLAMA_UPGRADE_CTA}</p>
          <p className="text-xs text-nisk-muted mb-4">
            Connect your own Ollama engine on your machine for unlimited private builds — no cloud
            credits consumed.
          </p>
          <Link
            href="/pricing"
            className="text-[var(--accent-cyan)] hover:underline font-medium text-sm"
          >
            Upgrade to Agency →
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Locked affordance for Pro/Free users who open engine settings in builder */
export function BuilderOllamaLockedHint({ onUpgradeClick }: { onUpgradeClick: () => void }) {
  return (
    <div className="shrink-0 border-t border-nisk p-2">
      <p className="text-[9px] uppercase tracking-wider text-nisk-muted mb-1.5 px-1">Engine</p>
      <button
        type="button"
        onClick={onUpgradeClick}
        className="w-full text-left flex items-start gap-2 px-1 py-1.5 rounded-lg hover:bg-[var(--surface-elevated)] opacity-70"
      >
        <span className="text-[10px] shrink-0 mt-0.5">🔒</span>
        <span className="text-[10px] leading-snug text-gray-400">
          Connect Local Ollama
          <span className="block text-nisk-muted mt-0.5">Agency plan required</span>
        </span>
      </button>
    </div>
  );
}
