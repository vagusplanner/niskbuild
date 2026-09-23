"use client";

import { useEffect, useRef, useState } from 'react';
import {
  GENERATION_MODELS,
  canSelectGenerationModel,
  generationModelLockedReason,
  getGenerationModel,
  type GenerationModelId,
} from '@/lib/generation-models';

type Props = {
  value: GenerationModelId;
  onChange: (id: GenerationModelId) => void;
  tier?: string;
  /** Platform-owner bypass — unlocks Pro-gated models regardless of profile tier */
  platformOwnerBypass?: boolean;
  disabled?: boolean;
  onUpgrade?: () => void;
};

export default function GenerationModelPicker({
  value,
  onChange,
  tier = 'free',
  platformOwnerBypass = false,
  disabled = false,
  onUpgrade,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = getGenerationModel(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-nisk bg-nisk text-[10px] text-gray-300 hover:border-[var(--copper-primary)]/50 transition-colors disabled:opacity-50 max-w-[11rem]"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={`${selected.label} · ${selected.creditCost} credit${selected.creditCost === 1 ? '' : 's'}`}
      >
        <span className="truncate">{selected.shortLabel}</span>
        <span className="text-[var(--copper-melt)] shrink-0 tabular-nums">
          {selected.creditCost}cr
        </span>
        <span className="text-[var(--code-comment)] shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 mb-1.5 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated,#241f1a)] shadow-lg overflow-hidden"
        >
          <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-[var(--code-comment)] border-b border-[var(--border)]/60">
            Model per generation
          </p>
          <ul className="max-h-72 overflow-y-auto py-1">
            {GENERATION_MODELS.map((model) => {
              const locked = !canSelectGenerationModel(model, tier, platformOwnerBypass);
              const active = model.id === selected.id;
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                      locked
                        ? 'opacity-45 cursor-pointer'
                        : active
                          ? 'bg-[var(--copper-primary)]/15 text-[var(--foreground)]'
                          : 'hover:bg-[var(--code-bg)] text-[var(--foreground)]'
                    }`}
                    onClick={() => {
                      if (locked) {
                        onUpgrade?.();
                        setOpen(false);
                        return;
                      }
                      onChange(model.id);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium leading-snug">
                        {model.label}
                        {locked && (
                          <span className="ml-1.5 text-[10px] text-[var(--copper-melt)] font-normal">
                            🔒 {generationModelLockedReason(model)}
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-[var(--code-comment)] mt-0.5 leading-snug">
                        {locked
                          ? 'Upgrade to Pro Worker to unlock'
                          : model.blurb}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--copper-melt)] pt-0.5">
                      {model.creditCost} cr
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
