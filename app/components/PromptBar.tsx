"use client";

import { useRef, useState } from 'react';
import { PROMPT_SUGGESTIONS, PROMPT_SUGGESTION_COUNT } from '@/lib/prompt-suggestions';
import { modKey } from '@/lib/keyboard';
import AiProviderSelector from '@/app/components/AiProviderSelector';
import FigmaScreenshotImport from '@/app/components/FigmaScreenshotImport';
import PromptAttachMenu from '@/app/components/PromptAttachMenu';
import GenerationModelPicker from '@/app/components/GenerationModelPicker';
import GenerationActivityPanel from '@/app/components/GenerationActivityPanel';
import type { GenerationModelId } from '@/lib/generation-models';
import { DEFAULT_GENERATION_MODEL_ID } from '@/lib/generation-models';
import { formatCreditsRemainingLabel } from '@/lib/credits-display';

interface PromptBarProps {
  prompt: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  onBuildFromFigmaScreenshot?: (combinedPrompt: string) => void;
  onUploadZip?: (file: File) => void;
  onOpenGooglePlaces?: () => void;
  projectId?: string | null;
  isGenerating: boolean;
  statusMessage?: string;
  planMode?: boolean;
  onPlanModeChange?: (enabled: boolean) => void;
  /** Persist prompt to localStorage (HTML builder v1) */
  promptAutosaveEnabled?: boolean;
  onPromptAutosaveChange?: (enabled: boolean) => void;
  /** Simple (HTML) vs Full App (React+Vite multi-file) */
  outputMode?: 'simple' | 'full-app';
  onOutputModeChange?: (mode: 'simple' | 'full-app') => void;
  variant?: 'bottom' | 'sidebar' | 'dock' | 'cursor';
  /**
   * HTML builder dock redesign: parent renders activity + suggestions outside the
   * dock card. Composer only keeps textarea + pinned toolbar.
   */
  externalChrome?: boolean;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  /** Unlocks Pro-gated models for platform owners (profile tier may still be free) */
  platformOwnerBypass?: boolean;
  useLocalOllama?: boolean;
  onUseLocalOllamaChange?: (enabled: boolean) => void;
  onProviderUpgrade?: () => void;
  generationModelId?: GenerationModelId;
  onGenerationModelChange?: (id: GenerationModelId) => void;
  /** Inline credit balance next to the model picker */
  cloudCreditsRemaining?: number;
  cloudCreditsAllowance?: number;
  /** Scrollable generation log (Cursor-style) */
  activityLog?: string[];
  streamingLine?: string;
  /** Live plain-English explanation (Cursor-style) — secondary when steps are present */
  streamingNarration?: string;
  /** Marker/heuristic build steps tied to the code stream (preferred over narration) */
  streamingSteps?: Array<{ id: string; label: string; source: string }>;
  /** Raw code tokens — hidden in UI unless showCodeStream */
  streamingCode?: string;
  showCodeStream?: boolean;
  promptRows?: number;
  promptMinHeight?: number;
  /** Project-aware suggestion chips (falls back to defaults) */
  suggestions?: string[];
  /** Current page being edited in multi-page projects */
  editingPageLabel?: string;
  uploadAccept?: string;
  uploadLabel?: string;
}

function SuggestionChips({
  onPick,
  suggestions,
}: {
  onPick: (s: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="text-left px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] text-xs text-[var(--code-comment)] hover:text-[var(--code-keyword)] hover:border-[var(--copper-primary)]/40 transition-colors line-clamp-1 max-w-full"
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
  onBuildFromFigmaScreenshot,
  onUploadZip,
  onOpenGooglePlaces,
  projectId,
  isGenerating,
  statusMessage,
  planMode = false,
  onPlanModeChange,
  promptAutosaveEnabled,
  onPromptAutosaveChange,
  outputMode = 'simple',
  onOutputModeChange,
  variant = 'bottom',
  externalChrome = false,
  subscriptionTier = 'free',
  subscriptionStatus = 'inactive',
  platformOwnerBypass = false,
  useLocalOllama = false,
  onUseLocalOllamaChange,
  onProviderUpgrade,
  generationModelId = DEFAULT_GENERATION_MODEL_ID,
  onGenerationModelChange,
  cloudCreditsRemaining,
  cloudCreditsAllowance = 0,
  activityLog = [],
  streamingLine,
  streamingNarration,
  streamingSteps = [],
  streamingCode,
  showCodeStream = false,
  promptRows = 5,
  promptMinHeight,
  suggestions,
  editingPageLabel,
  uploadAccept,
  uploadLabel,
}: PromptBarProps) {
  const chipSuggestions =
    suggestions && suggestions.length > 0
      ? suggestions.slice(0, PROMPT_SUGGESTION_COUNT)
      : PROMPT_SUGGESTIONS.slice(0, PROMPT_SUGGESTION_COUNT);
  const isCursor = variant === 'cursor' || variant === 'dock';
  const isSidebar = variant === 'sidebar';
  const mod = modKey();
  const [figmaOpen, setFigmaOpen] = useState(false);
  const figmaTriggerRef = useRef<HTMLDivElement>(null);

  const attachMenu =
    isCursor ? (
      <PromptAttachMenu
        disabled={isGenerating}
        onUploadZip={onUploadZip}
        onOpenGooglePlaces={onOpenGooglePlaces}
        onOpenFigma={onBuildFromFigmaScreenshot ? () => setFigmaOpen(true) : undefined}
        uploadAccept={uploadAccept}
        uploadLabel={uploadLabel}
      />
    ) : null;

  const figmaHidden =
    onBuildFromFigmaScreenshot && isCursor ? (
      <div ref={figmaTriggerRef} className="sr-only">
        <FigmaScreenshotImport
          projectId={projectId}
          userPrompt={prompt}
          onBuild={onBuildFromFigmaScreenshot}
          disabled={isGenerating}
          compact
          hideTrigger
          open={figmaOpen}
          onOpenChange={setFigmaOpen}
        />
      </div>
    ) : null;

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-t border-[var(--border)]/60 bg-[var(--surface)]/50 relative z-[1] shrink-0">
      {attachMenu}
      {isCursor && onGenerationModelChange && !useLocalOllama && (
        <GenerationModelPicker
          value={generationModelId}
          onChange={onGenerationModelChange}
          tier={subscriptionTier}
          platformOwnerBypass={platformOwnerBypass}
          disabled={isGenerating}
          onUpgrade={onProviderUpgrade}
        />
      )}
      {isCursor &&
        typeof cloudCreditsRemaining === 'number' &&
        (cloudCreditsRemaining > 0 || cloudCreditsAllowance > 0) && (
          <span
            className="text-[10px] tabular-nums text-[var(--copper-melt)] px-1.5 py-0.5 rounded-md border border-[var(--border)]/80 bg-[var(--code-bg)]"
            title="Cloud credits remaining"
          >
            {formatCreditsRemainingLabel(cloudCreditsRemaining, cloudCreditsAllowance)}
          </span>
        )}
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
          <span className="text-xs text-nisk-muted">Plan</span>
        </label>
      )}
      {onOutputModeChange && (
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--code-bg)] p-0.5"
          role="group"
          aria-label="Generation mode"
          title={
            outputMode === 'full-app'
              ? 'Full App: multi-file React + Vite with routing and shared state'
              : 'Simple: single-file or multi-page HTML'
          }
        >
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => onOutputModeChange('simple')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 ${
              outputMode === 'simple'
                ? 'bg-[var(--copper-primary)]/20 text-[var(--copper-melt)]'
                : 'text-nisk-muted hover:text-[var(--foreground)]'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => onOutputModeChange('full-app')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 ${
              outputMode === 'full-app'
                ? 'bg-[var(--copper-primary)]/20 text-[var(--copper-melt)]'
                : 'text-nisk-muted hover:text-[var(--foreground)]'
            }`}
          >
            Full App
          </button>
        </div>
      )}
      {onPromptAutosaveChange && (
        <label
          className="flex items-center gap-1.5 cursor-pointer"
          title="Save your prompt locally so it restores if you leave and come back"
        >
          <input
            type="checkbox"
            checked={promptAutosaveEnabled !== false}
            onChange={(e) => onPromptAutosaveChange(e.target.checked)}
            className="rounded border-nisk scale-90 accent-[var(--copper-primary)]"
          />
          <span className="text-xs text-nisk-muted">Save prompt draft</span>
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
      <div className="flex flex-col gap-0 px-3 pt-2 pb-2 min-h-0 flex-1">
        {figmaHidden}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[0_4px_24px_rgba(0,0,0,0.25)] focus-within:border-[var(--copper-primary)]/40 focus-within:ring-1 focus-within:ring-[var(--copper-primary)]/20 transition-all flex flex-col min-h-0 flex-1 overflow-hidden">
          {editingPageLabel && (
            <p className="text-[11px] font-medium text-[var(--copper-melt)] px-3 pt-2.5 pb-1 shrink-0">
              Editing page: {editingPageLabel}
            </p>
          )}
          {!externalChrome && (
            <GenerationActivityPanel
              activityLog={activityLog}
              streamingSteps={streamingSteps}
              streamingNarration={streamingNarration}
              streamingLine={streamingLine}
              streamingCode={streamingCode}
              showCodeStream={showCodeStream}
              isGenerating={isGenerating}
              planMode={planMode}
              embedded
            />
          )}
          {!externalChrome && (
            <div className="shrink-0">
              <SuggestionChips onPick={onChange} suggestions={chipSuggestions} />
            </div>
          )}
          {/* Only the prompt text scrolls — toolbar stays pinned beneath */}
          <textarea
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              editingPageLabel
                ? `Describe changes for the ${editingPageLabel} page…`
                : outputMode === 'full-app'
                  ? 'Describe a multi-page React app (routing, shared nav/state)…'
                  : 'Describe what you want to build…'
            }
            rows={Math.min(promptRows, 6)}
            style={{
              flex: '1 1 auto',
              flexBasis: promptMinHeight
                ? Math.min(Math.max(promptMinHeight, 72), 220)
                : 120,
              minHeight: 72,
            }}
            className="w-full min-h-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed text-[var(--foreground)] placeholder-[var(--placeholder)] resize-none focus:outline-none overflow-y-auto font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
          />
          {toolbar}
        </div>
        {statusMessage && (
          <p
            className={`text-[11px] mt-1.5 px-1 leading-snug whitespace-pre-wrap break-words font-mono shrink-0 max-h-16 overflow-y-auto ${
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
        <p className="text-[10px] text-nisk-muted mt-0.5 px-1 shrink-0">{mod} + Enter to generate</p>
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
        <SuggestionChips onPick={onChange} suggestions={chipSuggestions} />
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
        <p
          className={`text-[11px] shrink-0 leading-snug whitespace-pre-wrap break-words font-mono ${
            statusMessage.includes('❌')
              ? 'text-[var(--error)] max-h-48 overflow-y-auto'
              : 'text-[var(--copper-melt)]'
          }`}
        >
          {statusMessage}
        </p>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        {onBuildFromFigmaScreenshot && (
          <FigmaScreenshotImport
            projectId={projectId}
            userPrompt={prompt}
            onBuild={onBuildFromFigmaScreenshot}
            disabled={isGenerating}
            compact
          />
        )}
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
