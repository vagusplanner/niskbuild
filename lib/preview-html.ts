/**
 * Sanitize AI-generated HTML before loading in the builder preview iframe.
 * Fixes broken CDN URLs, placeholder assets, and missing CSS custom properties.
 *
 * CRITICAL: srcDoc documents resolve relative URLs against the *parent* page
 * (WHATWG). So href="/login" inside generated HTML loads NiskBuild's own
 * /login inside the preview. We isolate with a fake <base> + navigation guard.
 */

const PREVIEW_ROOT_VARS = `
:root {
  --color-border: hsl(214.3, 31.8%, 91.4%);
  --color-bg: hsl(0, 0%, 100%);
  --color-fg: hsl(222.2, 84%, 4.9%);
  --color-muted: hsl(215.4, 16.3%, 46.9%);
  --color-accent: hsl(210, 40%, 96.1%);
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(222.2, 84%, 4.9%);
  --border: hsl(214.3, 31.8%, 91.4%);
  --primary: hsl(222.2, 47.4%, 11.2%);
  --secondary: hsl(210, 40%, 96.1%);
  --muted: hsl(210, 40%, 96.1%);
  --card: hsl(0, 0%, 100%);
  --ring: hsl(215, 20.2%, 65.1%);
}
[class*="border-[--color-border]"] { border-color: var(--color-border) !important; }
[class*="bg-[--color-bg]"] { background-color: var(--color-bg) !important; }
`;

const PREVIEW_VARS_STYLE = `<style data-niskbuild-preview-vars>${PREVIEW_ROOT_VARS}</style>`;

/** Non-routable origin so path-absolute URLs never hit the parent NiskBuild app. */
export const PREVIEW_ISOLATION_BASE = 'https://niskbuild-preview.invalid/';

const PREVIEW_BASE_TAG = `<base href="${PREVIEW_ISOLATION_BASE}" data-niskbuild-preview-base="1">`;

/**
 * Blocks in-preview navigations that would load the parent app (e.g. /login).
 * Allows hash/mailto/tel and relative *.html pages used by multi-page previews.
 */
const PREVIEW_NAV_GUARD = `<script data-niskbuild-preview-guard="1">
(function(){
  function allowHref(href){
    if(href==null)return true;
    var h=String(href).trim();
    if(!h||h.charAt(0)==='#'||/^mailto:/i.test(h)||/^tel:/i.test(h)||/^javascript:/i.test(h))return true;
    if(/^[.\\/\\w%-]+\\.html?([?#].*)?$/i.test(h))return true;
    if(h.charAt(0)==='/' )return false;
    if(/^https?:\\/\\//i.test(h)){
      try{return new URL(h).hostname==='niskbuild-preview.invalid';}catch(e){return false;}
    }
    return true;
  }
  function stop(e){e.preventDefault();e.stopPropagation();}
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t||!t.closest)return;
    var a=t.closest('a[href]');
    if(!a)return;
    if(allowHref(a.getAttribute('href')))return;
    stop(e);
  },true);
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(!f||f.tagName!=='FORM')return;
    var action=f.getAttribute('action');
    if(action==null||action===''||action==='#')return;
    if(allowHref(action))return;
    stop(e);
  },true);
  try{
    var open=window.open;
    window.open=function(url){
      if(url!=null&&!allowHref(String(url)))return null;
      return open.apply(this,arguments);
    };
  }catch(e){}
})();
<\/script>`;

const TAILWIND_PLAYGROUND = '<script src="https://cdn.tailwindcss.com"><\/script>';

const FONTAWESOME_PLACEHOLDER_RE =
  /<script[^>]*src=["']https:\/\/kit\.fontawesome\.com\/[^"']*["'][^>]*>\s*<\/script>/gi;

const BROKEN_TAILWIND_CDN_RE =
  /https:\/\/cdn\.jsdelivr\.net\/npm\/tailwindcss@[^"']+\/dist\/tailwind\.min\.js/gi;

function injectIntoHead(html: string, snippet: string): string {
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${snippet}`);
  }
  if (html.includes('</head>')) {
    return html.replace('</head>', `${snippet}</head>`);
  }
  if (html.includes('<html')) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${snippet}</head>`);
  }
  return `${snippet}${html}`;
}

function usesTailwindMarkup(html: string): boolean {
  return /class=["'][^"']*\b(flex|grid|p-\d|m-\d|bg-|text-|rounded|border-|w-|h-|gap-|space-)/i.test(
    html
  );
}

function hasTailwindRuntime(html: string): boolean {
  return /cdn\.tailwindcss\.com|tailwind\.min\.js/i.test(html);
}

/** Isolate preview from parent routing + keep styles/CDN fixes. */
export function preparePreviewHtml(html: string): string {
  if (!html?.trim()) return html;

  let out = html;

  out = out.replace(FONTAWESOME_PLACEHOLDER_RE, '');
  out = out.replace(BROKEN_TAILWIND_CDN_RE, 'https://cdn.tailwindcss.com');

  if (!hasTailwindRuntime(out) && usesTailwindMarkup(out)) {
    out = injectIntoHead(out, TAILWIND_PLAYGROUND);
  }

  if (!out.includes('data-niskbuild-preview-vars')) {
    out = injectIntoHead(out, PREVIEW_VARS_STYLE);
  }

  // Base must be early in <head> so relative URL resolution never uses the parent origin.
  if (!out.includes('data-niskbuild-preview-base')) {
    out = injectIntoHead(out, PREVIEW_BASE_TAG);
  }

  if (!out.includes('data-niskbuild-preview-guard')) {
    if (out.includes('</body>')) {
      out = out.replace('</body>', `${PREVIEW_NAV_GUARD}</body>`);
    } else {
      out = `${out}${PREVIEW_NAV_GUARD}`;
    }
  }

  return out;
}

/**
 * Sandbox for user-generated preview — scripts + forms required.
 * Omit allow-same-origin (sandbox escape) and allow-popups (parent-like windows).
 */
export const BUILDER_PREVIEW_SANDBOX =
  'allow-scripts allow-forms allow-modals' as const;
