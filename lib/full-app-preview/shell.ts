/**
 * Preview iframe HTML shell: import map + CSS + ESM blob entry + chrome bridges.
 */

import { buildPreviewImportMap } from '@/lib/full-app-preview/allowlist';
import {
  FULL_APP_CONSOLE_BRIDGE,
  FULL_APP_NAV_BRIDGE,
  FULL_APP_STORAGE_POLYFILL,
} from '@/lib/full-app-preview/bridges';

export type FullAppPreviewBackendEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type PreviewShellOptions = {
  /** Bundled ESM source (react/react-dom remain external). */
  code: string;
  /** Concatenated project CSS. */
  css?: string;
  /** Optional marker for spike debugging. */
  title?: string;
  /** BYO Supabase credentials injected before the app module loads. */
  backend?: FullAppPreviewBackendEnv | null;
};

function buildBackendBootstrap(backend?: FullAppPreviewBackendEnv | null): string {
  // Always mark preview host so DataClient can opt out of Web Locks
  // (navigator.locks.request throws in sandboxed blob iframes).
  const previewFlag = `window.__NISK_PREVIEW__ = true;`;
  // Process-lock polyfill: auth-js calls navigator.locks.request for session
  // refresh coordination. In this sandbox it fails with
  // "LockManager.request: request() is not allowed in this context".
  // Replace with an in-process queue before any app/supabase code loads.
  const locksPolyfill = `(function(){
  try {
    var queues = Object.create(null);
    function processRequest(name, options, callback) {
      var fn = typeof options === 'function' ? options : callback;
      if (typeof fn !== 'function') return Promise.resolve();
      var prev = queues[name] || Promise.resolve();
      var result = prev.catch(function(){}).then(function(){
        return fn({ name: name, mode: 'exclusive' });
      });
      queues[name] = result.then(function(){}, function(){});
      return result;
    }
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      enumerable: true,
      value: {
        request: processRequest,
        query: function(){ return Promise.resolve({ held: [], pending: [] }); }
      }
    });
  } catch (e) { /* ignore */ }
})();`;

  if (!backend?.supabaseUrl?.trim() || !backend?.supabaseAnonKey?.trim()) {
    return `<script data-niskbuild-preview-backend="1">
${previewFlag}
${locksPolyfill}
window.__NISK_BACKEND__ = window.__NISK_BACKEND__ || {};
</script>`;
  }
  const payload = JSON.stringify({
    supabaseUrl: backend.supabaseUrl.trim(),
    supabaseAnonKey: backend.supabaseAnonKey.trim(),
  });
  return `<script data-niskbuild-preview-backend="1">
${previewFlag}
${locksPolyfill}
window.__NISK_BACKEND__ = ${payload};
</script>`;
}

/**
 * Build a complete HTML document for iframe srcDoc.
 * Module code is base64-decoded then loaded via blob URL inside the iframe.
 */
export function buildFullAppPreviewHtml(opts: PreviewShellOptions): string {
  const importMap = buildPreviewImportMap();
  const title = opts.title ?? 'Full App Preview';
  const css = opts.css ?? '';
  const codeB64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(opts.code)))
      : Buffer.from(opts.code, 'utf8').toString('base64');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  ${FULL_APP_STORAGE_POLYFILL}
  ${FULL_APP_CONSOLE_BRIDGE}
  ${buildBackendBootstrap(opts.backend)}
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
  ${FULL_APP_NAV_BRIDGE}
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
