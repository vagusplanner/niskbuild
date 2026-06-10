"use client";

import { useState } from 'react';

export interface InspectTarget {
  tag: string;
  id: string;
  classes: string;
  text: string;
}

interface InspectPickerProps {
  active: boolean;
  onToggle: () => void;
  target: InspectTarget | null;
  onClearTarget: () => void;
  onSubmit: (changePrompt: string) => void;
  isGenerating: boolean;
}

export default function InspectPicker({
  active,
  onToggle,
  target,
  onClearTarget,
  onSubmit,
  isGenerating,
}: InspectPickerProps) {
  const [changePrompt, setChangePrompt] = useState('');

  const handleSubmit = () => {
    if (!changePrompt.trim() || !target) return;
    onSubmit(changePrompt.trim());
    setChangePrompt('');
    onClearTarget();
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`px-2 py-1 text-[10px] rounded border transition-colors ${
          active
            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]'
            : 'border-nisk text-nisk-muted hover:text-white'
        }`}
        title="Click elements in preview to target edits"
      >
        🎯 Target
      </button>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-nisk-card border border-[var(--accent-cyan)]/40 rounded-xl p-5 shadow-2xl">
            <h3 className="text-white font-semibold mb-1">Targeted edit</h3>
            <p className="text-xs text-nisk-muted mb-3">
              &lt;{target.tag.toLowerCase()}&gt;
              {target.id ? ` #${target.id}` : ''}
              {target.classes ? ` .${target.classes.split(' ').filter(Boolean).slice(0, 2).join('.')}` : ''}
              {target.text ? ` — "${target.text.slice(0, 60)}"` : ''}
            </p>
            <textarea
              autoFocus
              value={changePrompt}
              onChange={(e) => setChangePrompt(e.target.value)}
              placeholder="What do you want to change about this element?"
              className="w-full bg-nisk border border-nisk rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-[var(--accent-cyan)]"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClearTarget}
                className="flex-1 py-2 rounded-lg border border-nisk text-sm text-nisk-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!changePrompt.trim() || isGenerating}
                className="flex-1 py-2 rounded-lg bg-gradient-brand text-white text-sm font-medium disabled:opacity-50"
              >
                Apply to element
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function injectInspectScript(html: string): string {
  const script = `<script>
(function(){
  if(window.__niskInspect) return;
  window.__niskInspect = true;
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if(!el || el === document.body) return;
    window.parent.postMessage({
      type: 'niskbuild-inspect',
      tag: el.tagName || '',
      id: el.id || '',
      classes: typeof el.className === 'string' ? el.className : '',
      text: (el.innerText || '').trim().slice(0, 120)
    }, '*');
  }, true);
  document.body.style.cursor = 'crosshair';
})();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }
  return html + script;
}
