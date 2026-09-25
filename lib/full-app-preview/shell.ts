/**
 * Preview iframe HTML shell: import map + CSS + ESM blob entry.
 */

import { buildPreviewImportMap } from '@/lib/full-app-preview/allowlist';

export type PreviewShellOptions = {
  /** Bundled ESM source (react/react-dom remain external). */
  code: string;
  /** Concatenated project CSS. */
  css?: string;
  /** Optional marker for spike debugging. */
  title?: string;
};

/**
 * Build a complete HTML document for iframe srcDoc / blob URL.
 * Module code is inlined as a blob: URL so we avoid escaping hell in srcDoc.
 * For srcDoc without blob (sandbox without same-origin), we inline the module
 * via a data URL instead.
 */
export function buildFullAppPreviewHtml(opts: PreviewShellOptions): string {
  const importMap = buildPreviewImportMap();
  const title = opts.title ?? 'Full App Preview';
  const css = opts.css ?? '';
  // Escape for embedding inside a script type=importmap / module
  const codeB64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(opts.code)))
    : Buffer.from(opts.code, 'utf8').toString('base64');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script type="importmap">
${JSON.stringify({ imports: importMap }, null, 2)}
  </script>
  <style>
    html, body, #root { margin: 0; min-height: 100%; }
    body { font-family: system-ui, sans-serif; }
${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    const code = decodeURIComponent(escape(atob(${JSON.stringify(codeB64)})));
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      await import(url);
    } catch (err) {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '<pre style="color:#b91c1c;padding:16px;white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace"></pre>';
        root.firstChild.textContent = 'Preview runtime error:\\n' + (err && err.stack ? err.stack : String(err));
      }
      console.error(err);
    } finally {
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
