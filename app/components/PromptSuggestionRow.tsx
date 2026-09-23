"use client";

type PromptSuggestionRowProps = {
  suggestions: string[];
  onPick: (suggestion: string) => void;
};

/** Horizontal-scroll suggestion chips — sits above the prompt dock card. */
export default function PromptSuggestionRow({
  suggestions,
  onPick,
}: PromptSuggestionRowProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-[var(--border)]/50 bg-[var(--surface)]/40">
      <div
        className="flex gap-1.5 px-3 py-2 overflow-x-auto overscroll-x-contain"
        style={{ scrollbarWidth: 'thin' }}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="shrink-0 text-left px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] text-xs text-[var(--code-comment)] hover:text-[var(--code-keyword)] hover:border-[var(--copper-primary)]/40 transition-colors max-w-[14rem] truncate"
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
