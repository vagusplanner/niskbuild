"use client";

type VisualEditorToolbarProps = {
  editMode: boolean;
  onToggleEditMode: () => void;
  canUseEditor: boolean;
  mobilePreview: boolean;
  onToggleMobilePreview: () => void;
  showMobileToggle: boolean;
  showUndoReset: boolean;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  canReset: boolean;
  selectedLabel?: string;
};

export default function VisualEditorToolbar({
  editMode,
  onToggleEditMode,
  canUseEditor,
  mobilePreview,
  onToggleMobilePreview,
  showMobileToggle,
  showUndoReset,
  onUndo,
  onReset,
  canUndo,
  canReset,
  selectedLabel,
}: VisualEditorToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-nisk bg-nisk-surface/80 shrink-0 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onToggleEditMode}
          disabled={!canUseEditor}
          title={
            canUseEditor
              ? 'Click elements in preview to edit styles'
              : 'Visual editing requires Free or Pro plan'
          }
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 ${
            editMode
              ? 'bg-emerald-600/90 text-white'
              : 'bg-nisk border border-nisk text-gray-300 hover:text-white hover:border-[var(--accent-cyan)]/50'
          }`}
        >
          <span>🎨</span>
          {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
        </button>

        {editMode && showMobileToggle && (
          <button
            type="button"
            onClick={onToggleMobilePreview}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              mobilePreview
                ? 'bg-purple-600/90 text-white'
                : 'bg-nisk border border-nisk text-gray-300 hover:text-white'
            }`}
          >
            📱 Mobile Preview
          </button>
        )}

        {editMode && showUndoReset && (
          <>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-3 py-1.5 rounded-lg text-xs bg-nisk border border-nisk text-gray-300 hover:text-white disabled:opacity-40"
            >
              ↩️ Undo
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset}
              className="px-3 py-1.5 rounded-lg text-xs bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 disabled:opacity-40"
            >
              🔄 Reset
            </button>
          </>
        )}
      </div>

      {editMode && selectedLabel && (
        <p className="text-[10px] text-nisk-muted truncate max-w-[240px]">
          Editing: <span className="text-[var(--accent-cyan)]">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
}
