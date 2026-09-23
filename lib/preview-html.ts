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

/**
 * Relays console.log/warn/error + uncaught errors/rejections to the parent
 * via postMessage so the builder can show an in-preview console panel.
 * Injected early in <head> so it wraps console before generated body scripts run.
 */
const PREVIEW_CONSOLE_CAPTURE = `<script data-niskbuild-preview-console="1">
(function(){
  if(window.__niskbuildConsoleHooked)return;
  window.__niskbuildConsoleHooked=true;
  function ser(v){
    if(v==null)return String(v);
    var t=typeof v;
    if(t==='string')return v;
    if(t==='number'||t==='boolean'||t==='bigint'||t==='symbol'||t==='function')return String(v);
    if(typeof Error!=='undefined'&&v instanceof Error)return v.message||String(v);
    try{return JSON.stringify(v);}catch(e){try{return String(v);}catch(e2){return '[unserializable]';}}
  }
  function send(level,args,stack){
    var parts=[];
    for(var i=0;i<args.length;i++)parts.push(ser(args[i]));
    try{
      parent.postMessage({
        type:'niskbuild-preview-console',
        level:level,
        message:parts.join(' '),
        stack:stack||undefined,
        ts:Date.now()
      },'*');
    }catch(e){}
  }
  ['log','warn','error'].forEach(function(level){
    var orig=console[level];
    console[level]=function(){
      var args=Array.prototype.slice.call(arguments);
      send(level,args);
      if(typeof orig==='function'){
        try{return orig.apply(console,args);}catch(e){}
      }
    };
  });
  window.addEventListener('error',function(e){
    var msg=e&&e.message?e.message:'Uncaught error';
    var stack=(e&&e.error&&e.error.stack)||undefined;
    send('error',[msg],stack);
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e&&e.reason;
    var msg=(typeof Error!=='undefined'&&r instanceof Error)?(r.message||String(r)):ser(r);
    var stack=(typeof Error!=='undefined'&&r instanceof Error)?r.stack:undefined;
    send('error',['Unhandled rejection: '+msg],stack);
  });
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

  // Last head inject → first in <head>, so console is wrapped before body scripts.
  if (!out.includes('data-niskbuild-preview-console')) {
    out = injectIntoHead(out, PREVIEW_CONSOLE_CAPTURE);
  }

  return out;
}

/**
 * Sandbox for user-generated preview — scripts + forms required.
 * Omit allow-same-origin (sandbox escape) and allow-popups (parent-like windows).
 */
export const BUILDER_PREVIEW_SANDBOX =
  'allow-scripts allow-forms allow-modals' as const;
