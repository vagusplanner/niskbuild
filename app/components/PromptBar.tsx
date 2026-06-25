"use client";

import { PROMPT_SUGGESTIONS, PROMPT_SUGGESTION_COUNT } from '@/lib/prompt-suggestions';
import { modKey } from '@/lib/keyboard';
import AiProviderSelector from '@/app/components/AiProviderSelector';

interface PromptBarProps {
  prompt: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage?: string;
  planMode?: boolean;
  onPlanModeChange?: (enabled: boolean) => void;
  variant?: 'bottom' | 'sidebar' | 'dock' | 'cursor';
  subscriptionTier?: string;
  subscriptionStatus?: string;
  useLocalOllama?: boolean;
  onUseLocalOllamaChange?: (enabled: boolean) => void;
  onProviderUpgrade?: () => void;
}

function SuggestionChips({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
      {PROMPT_SUGGESTIONS.slice(0, PROMPT_SUGGESTION_COUNT).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="text-left px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] text-[10px] text-[var(--code-comment)] hover:text-[var(--code-keyword)] hover:border-[var(--copper-primary)]/40 transition-colors line-clamp-1 max-w-full"
          title={s}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export default function PromptBar({
  prompt,
  onChange,
  onGenerate,
  isGenerating,
  statusMessage,
  planMode = false,
  onPlanModeChange,
  variant = 'bottom',
  subscriptionTier = 'free',
  subscriptionStatus = 'inactive',
  useLocalOllama = false,
  onUseLocalOllamaChange,
  onProviderUpgrade,
}: PromptBarProps) {
  const isCursor = variant === 'cursor' || variant === 'dock';
  const isSidebar = variant === 'sidebar';
  const mod = modKey();

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-t border-[var(--border)]/60 bg-[var(--surface)]/50 relative z-[1]">
      {isCursor && onUseLocalOllamaChange && onProviderUpgrade && (
        <AiProviderSelector
          tier={subscriptionTier}
          status={subscriptionStatus}
          useLocalOllama={useLocalOllama}
          onUseLocalOllamaChange={onUseLocalOllamaChange}
          onUpgrade={onProviderUpgrade}
        />
      )}
      {onPlanModeChange && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={planMode}
            onChange={(e) => onPlanModeChange(e.target.checked)}
            className="rounded border-nisk scale-90 accent-[var(--copper-primary)]"
          />
          <span className="text-[10px] text-nisk-muted">Plan</span>
        </label>
      )}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="btn-primary rounded-lg text-xs font-semibold disabled:opacity-50 ml-auto px-4 py-2"
      >
        {isGenerating
          ? planMode
            ? 'Planning…'
            : 'Building…'
          : planMode
            ? 'Plan'
            : 'Generate'}
      </button>
    </div>
  );

  if (isCursor) {
    return (
      <div className="flex flex-col gap-0 px-3 py-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[0_4px_24px_rgba(0,0,0,0.25)] overflow-hidden focus-within:border-[var(--copper-primary)]/40 focus-within:ring-1 focus-within:ring-[var(--copper-primary)]/20 transition-all">
          <SuggestionChips onPick={onChange} />
          <textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe what you want to build…"
            rows={4}
            className="w-full bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--placeholder)] resize-none focus:outline-none min-h-[96px] font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
          />
          {toolbar}
        </div>
        {statusMessage && (
          <p
            className={`text-[11px] mt-2 px-1 leading-snug ${
              statusMessage.includes('✅')
                ? 'text-[var(--success)]'
                : statusMessage.includes('❌')
                  ? 'text-[var(--error)]'
                  : 'text-[var(--copper-melt)]'
            }`}
          >
            {statusMessage}
          </p>
        )}
        <p className="text-[10px] text-nisk-muted mt-1 px-1">{mod} + Enter to generate</p>
      </div>
    );
  }

  return (
    <div
      className={
        isSidebar
          ? 'flex-1 min-h-0 flex flex-col px-4 py-4 gap-3 overflow-hidden'
          : 'shrink-0 border-t border-nisk bg-nisk-card/95 backdrop-blur-md px-4 py-3'
      }
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden">
        <SuggestionChips onPick={onChange} />
        <textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe what you want to build..."
          rows={isSidebar ? 6 : 2}
          className={`w-full bg-transparent px-3 py-2.5 text-sm placeholder-[var(--placeholder)] resize-none focus:outline-none font-mono text-[var(--foreground)] ${
            isSidebar ? 'flex-1 min-h-[100px]' : ''
          }`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
          }}
        />
      </div>

      {statusMessage && (
        <p className="text-[11px] shrink-0 leading-snug text-[var(--copper-melt)]">{statusMessage}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`btn-primary rounded-xl text-sm font-semibold disabled:opacity-50 ${
            isSidebar ? 'flex-1 py-3' : 'px-6 py-3'
          }`}
        >
          {isGenerating ? 'Building…' : 'Generate'}
        </button>
      </div>

      <p className="text-[10px] text-nisk-muted shrink-0">{mod} + Enter to generate</p>
    </div>
  );
}
