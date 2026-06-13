"use client";

import { PROMPT_SUGGESTIONS } from '@/lib/prompt-suggestions';

interface PromptBarProps {
  prompt: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  statusMessage?: string;
  planMode?: boolean;
  onPlanModeChange?: (enabled: boolean) => void;
  variant?: 'bottom' | 'sidebar';
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
}: PromptBarProps) {
  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={
        isSidebar
          ? 'flex-1 min-h-0 flex flex-col px-4 py-4 gap-3 overflow-hidden'
          : 'shrink-0 border-t border-nisk bg-nisk-card/95 backdrop-blur-md px-4 py-3'
      }
    >
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
            <span className="text-[10px] text-gray-300">
              Plan Mode <span className="text-[var(--accent-cyan)]">(0 credits)</span>
            </span>
          </label>
        )}
      </div>

      {!isSidebar && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="shrink-0 max-w-[220px] truncate px-3 py-1.5 rounded-full text-[11px] border border-nisk text-gray-300 hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {isSidebar && (
        <div className="shrink-0 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {PROMPT_SUGGESTIONS.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="text-left px-2.5 py-1.5 rounded-lg text-[10px] border border-nisk text-gray-400 hover:border-[var(--accent-cyan)]/50 hover:text-[var(--accent-cyan)] transition-all line-clamp-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className={`flex gap-3 ${isSidebar ? 'flex-col flex-1 min-h-0' : 'items-end'}`}>
        <div className={`min-w-0 ${isSidebar ? 'flex-1 flex flex-col' : 'flex-1'}`}>
          <textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe what you want to build..."
            rows={isSidebar ? 8 : 2}
            className={`w-full bg-nisk border border-nisk rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/30 ${
              isSidebar ? 'flex-1 min-h-[120px]' : ''
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
          />
          <p className="text-[10px] text-nisk-muted mt-1.5 shrink-0">⌘ + Enter to generate</p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`btn-primary rounded-xl text-sm font-semibold disabled:opacity-50 ${
            isSidebar ? 'w-full py-3 shrink-0' : 'shrink-0 px-6 py-3'
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

      {statusMessage && (
        <p
          className={`text-[11px] shrink-0 ${
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
    </div>
  );
}
