"use client";

import type { StyleChanges } from '@/lib/visual-editor-types';

type StylePanelProps = {
  breadcrumb: string[];
  styles: StyleChanges;
  onStyleChange: (key: keyof StyleChanges, value: string | number) => void;
  isMobile?: boolean;
  showMobileControls?: boolean;
  showUndoReset?: boolean;
  onUndo?: () => void;
  onReset?: () => void;
  canUndo?: boolean;
  canReset?: boolean;
  isApplying?: boolean;
};

export default function StylePanel({
  breadcrumb,
  styles,
  onStyleChange,
  isMobile = false,
  showMobileControls = false,
  showUndoReset = false,
  onUndo,
  onReset,
  canUndo = false,
  canReset = false,
  isApplying = false,
}: StylePanelProps) {
  return (
    <div className="w-72 lg:w-80 shrink-0 bg-nisk-card border-l border-nisk flex flex-col h-full">
      <div className="px-4 py-3 border-b border-nisk shrink-0">
        <h3 className="text-sm font-semibold text-white">Style Editor</h3>
        <p className="text-[10px] text-nisk-muted mt-1 truncate" title={breadcrumb.join(' > ')}>
          {breadcrumb.join(' > ')}
        </p>
        {isApplying && (
          <p className="text-[10px] text-[var(--accent-cyan)] mt-1 animate-pulse">Applying visual edit…</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-nisk-muted block mb-1">Background</label>
          <input
            type="color"
            value={styles.backgroundColor || '#1F2937'}
            onChange={(e) => onStyleChange('backgroundColor', e.target.value)}
            className="w-full h-9 rounded-lg bg-nisk border border-nisk cursor-pointer"
          />
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">Text color</label>
          <input
            type="color"
            value={styles.color || '#FFFFFF'}
            onChange={(e) => onStyleChange('color', e.target.value)}
            className="w-full h-9 rounded-lg bg-nisk border border-nisk cursor-pointer"
          />
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">
            Font size: {styles.fontSize || 16}px
          </label>
          <input
            type="range"
            min={8}
            max={72}
            value={styles.fontSize || 16}
            onChange={(e) => onStyleChange('fontSize', parseInt(e.target.value, 10))}
            className="w-full accent-[var(--accent-cyan)]"
          />
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">Font weight</label>
          <select
            value={styles.fontWeight || 400}
            onChange={(e) => onStyleChange('fontWeight', parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg bg-nisk border border-nisk text-white text-sm"
          >
            <option value={400}>Regular (400)</option>
            <option value={500}>Medium (500)</option>
            <option value={700}>Bold (700)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">Padding (px)</label>
          <div className="grid grid-cols-4 gap-2">
            {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((key, i) => (
              <input
                key={key}
                type="number"
                placeholder={['T', 'R', 'B', 'L'][i]}
                value={styles[key] ?? 0}
                onChange={(e) => onStyleChange(key, parseInt(e.target.value, 10) || 0)}
                className="w-full p-1.5 text-center text-xs rounded-lg bg-nisk border border-nisk text-white"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">
            Border radius: {styles.borderRadius || 0}px
          </label>
          <input
            type="range"
            min={0}
            max={50}
            value={styles.borderRadius || 0}
            onChange={(e) => onStyleChange('borderRadius', parseInt(e.target.value, 10))}
            className="w-full accent-[var(--accent-cyan)]"
          />
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">Border</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={styles.borderWidth || 0}
              onChange={(e) => onStyleChange('borderWidth', parseInt(e.target.value, 10) || 0)}
              className="w-16 p-1.5 text-center text-xs rounded-lg bg-nisk border border-nisk text-white"
            />
            <input
              type="color"
              value={styles.borderColor || '#4F6EF7'}
              onChange={(e) => onStyleChange('borderColor', e.target.value)}
              className="flex-1 h-9 rounded-lg bg-nisk border border-nisk cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">
            Opacity: {Math.round((styles.opacity ?? 1) * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={styles.opacity ?? 1}
            onChange={(e) => onStyleChange('opacity', parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-cyan)]"
          />
        </div>

        <div>
          <label className="text-xs text-nisk-muted block mb-1">Display</label>
          <button
            type="button"
            onClick={() => onStyleChange('display', styles.display === 'none' ? 'block' : 'none')}
            className={`w-full p-2 rounded-lg text-sm transition-colors ${
              styles.display === 'none'
                ? 'bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/40'
                : 'bg-nisk border border-nisk text-gray-300 hover:text-white'
            }`}
          >
            {styles.display === 'none' ? 'Show element' : 'Hide element'}
          </button>
        </div>

        {showMobileControls && isMobile && (
          <div className="pt-2 border-t border-nisk space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-purple-400">Mobile overrides</p>

            <div>
              <label className="text-xs text-nisk-muted block mb-1">
                Mobile font size: {styles.mobileFontSize || styles.fontSize || 16}px
              </label>
              <input
                type="range"
                min={8}
                max={72}
                value={styles.mobileFontSize || styles.fontSize || 16}
                onChange={(e) => onStyleChange('mobileFontSize', parseInt(e.target.value, 10))}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <label className="text-xs text-nisk-muted block mb-1">Mobile padding (px)</label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['mobilePaddingTop', 'paddingTop'],
                    ['mobilePaddingRight', 'paddingRight'],
                    ['mobilePaddingBottom', 'paddingBottom'],
                    ['mobilePaddingLeft', 'paddingLeft'],
                  ] as const
                ).map(([mobileKey, desktopKey], i) => (
                  <input
                    key={mobileKey}
                    type="number"
                    placeholder={['T', 'R', 'B', 'L'][i]}
                    value={styles[mobileKey] ?? styles[desktopKey] ?? 0}
                    onChange={(e) => onStyleChange(mobileKey, parseInt(e.target.value, 10) || 0)}
                    className="w-full p-1.5 text-center text-xs rounded-lg bg-nisk border border-nisk text-white"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-nisk-muted block mb-1">Visibility on mobile</label>
              <button
                type="button"
                onClick={() =>
                  onStyleChange(
                    'mobileDisplay',
                    styles.mobileDisplay === 'none' ? 'block' : 'none'
                  )
                }
                className={`w-full p-2 rounded-lg text-sm transition-colors ${
                  styles.mobileDisplay === 'none'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-nisk border border-nisk text-gray-300 hover:text-white'
                }`}
              >
                {styles.mobileDisplay === 'none' ? 'Show on mobile' : 'Hide on mobile'}
              </button>
            </div>
          </div>
        )}

        {showUndoReset && (
          <div className="flex gap-2 pt-2 border-t border-nisk">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || isApplying}
              className="flex-1 py-2 rounded-lg text-xs bg-nisk border border-nisk text-gray-300 hover:text-white disabled:opacity-40"
            >
              Undo last edit
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset || isApplying}
              className="flex-1 py-2 rounded-lg text-xs bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 disabled:opacity-40"
            >
              Reset to AI original
            </button>
          </div>
        )}

        <p className="text-[10px] text-nisk-muted text-center pt-2">
          Visual edits use <span className="text-[var(--accent-cyan)]">0.3 credits</span> each
        </p>
      </div>
    </div>
  );
}
