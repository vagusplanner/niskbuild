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
  variant?: 'bottom' | 'sidebar' | 'dock';
  subscriptionTier?: string;
  subscriptionStatus?: string;
  useLocalOllama?: boolean;
  onUseLocalOllamaChange?: (enabled: boolean) => void;
  onProviderUpgrade?: () => void;
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
  const isDock = variant === 'dock';
  const isSidebar = variant === 'sidebar';
  const mod = modKey();

  return (
    <div
      className={
        isDock
          ? 'flex flex-col gap-2 px-3 py-3'
          : isSidebar
            ? 'flex-1 min-h-0 flex flex-col px-4 py-4 gap-3 overflow-hidden'
            : 'shrink-0 border-t border-nisk bg-nisk-card/95 backdrop-blur-md px-4 py-3'
      }
    >
      {!isDock && (
        <div className={`flex items-center justify-between ${isSidebar ? 'shrink-0' : 'mb-2'}`}>
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">
            {isSidebar ? 'Describe your app' : 'Suggested prompts'}
          </p>
          {onPlanModeChange && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={planMode}
                onChange={(e) => onPlanModeChange(e.target.checked)}
                className="rounded border-nisk"
              />
              <span className="text-[10px] text-nisk-muted">
                Plan Mode <span className="text-[var(--accent-cyan)]">(0 credits)</span>
              </span>
            </label>
          )}
        </div>
      )}

      {!isSidebar && !isDock && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="shrink-0 max-w-[220px] truncate px-3 py-1.5 rounded-full text-[11px] border border-nisk text-nisk-muted hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {isDock && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
          {PROMPT_SUGGESTIONS.slice(0, PROMPT_SUGGESTION_COUNT).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              title={s}
              className="shrink-0 max-w-[140px] truncate px-2 py-1 rounded-full text-[10px] border border-nisk text-nisk-muted hover:border-[var(--accent-cyan)]/50 hover:text-[var(--accent-cyan)] transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you want to build..."
        rows={isDock ? 4 : isSidebar ? 6 : 2}
        className={`w-full glass-input rounded-xl px-3 py-2.5 text-sm placeholder-[var(--placeholder)] resize-none focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/30 ${
          isSidebar ? 'flex-1 min-h-[100px]' : ''
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
        }}
      />

      {statusMessage && (
        <p
          className={`text-[11px] shrink-0 leading-snug ${
            statusMessage.includes('✅')
              ? 'text-[var(--success)]'
              : statusMessage.includes('❌')
                ? 'text-[var(--error)]'
                : 'text-[var(--accent-cyan)]'
          }`}
        >
          {statusMessage}
        </p>
      )}

      <div className={`flex items-center gap-2 ${isDock ? 'flex-wrap' : 'gap-3'}`}>
        {isDock && onUseLocalOllamaChange && onProviderUpgrade && (
          <AiProviderSelector
            tier={subscriptionTier}
            status={subscriptionStatus}
            useLocalOllama={useLocalOllama}
            onUseLocalOllamaChange={onUseLocalOllamaChange}
            onUpgrade={onProviderUpgrade}
          />
        )}

        {isDock && onPlanModeChange && (
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0">
            <input
              type="checkbox"
              checked={planMode}
              onChange={(e) => onPlanModeChange(e.target.checked)}
              className="rounded border-nisk scale-90"
            />
            <span className="text-[10px] text-nisk-muted">Plan</span>
          </label>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`btn-primary rounded-xl text-sm font-semibold disabled:opacity-50 ${
            isDock ? 'flex-1 min-w-[120px] py-2.5' : isSidebar ? 'w-full py-3 shrink-0' : 'shrink-0 px-6 py-3'
          }`}
        >
          {isGenerating
            ? planMode
              ? 'Planning...'
              : 'Building...'
            : planMode
              ? 'Generate Plan'
              : 'Generate'}
        </button>
      </div>

      <p className="text-[10px] text-nisk-muted shrink-0">
        {mod} + Enter to generate
      </p>
    </div>
  );
}
