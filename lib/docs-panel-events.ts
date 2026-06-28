export const DOCS_PANEL_OPEN_EVENT = 'niskbuild:docs-panel-open';

export function openDocsPanel() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DOCS_PANEL_OPEN_EVENT));
}
