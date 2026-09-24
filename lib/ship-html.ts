/**
 * Compile used Tailwind utilities into static CSS for export/deploy.
 * Live preview keeps the CDN playground via preparePreviewHtml — this path is ship-only.
 *
 * Resilience: @tailwindcss/node is loaded dynamically and any compile failure falls back
 * to the CDN script so Export/Deploy never hard-fail with a non-JSON 500 HTML page.
 */

import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';

const TAILWIND_CDN_SCRIPT =
  '<script src="https://cdn.tailwindcss.com"></script>';

const TAILWIND_CDN_SCRIPT_RE =
  /<script\b[^>]*\bsrc=["'][^"']*(?:cdn\.tailwindcss\.com|cdn\.jsdelivr\.net\/npm\/tailwindcss)[^"']*["'][^>]*>\s*<\/script>\s*/gi;

/** Inline playground config that only works with the CDN runtime. */
const TAILWIND_CONFIG_SCRIPT_RE =
  /<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?\btailwind\s*\.\s*config\s*=[\s\S]*?<\/script>\s*/gi;

const CLASS_ATTR_RE = /\b(?:class|className)\s*=\s*(["'])([\s\S]*?)\1/gi;

const UTILITY_HINT_RE =
  /\b(flex|grid|p-\d|m-\d|bg-|text-|rounded|border-|w-|h-|gap-|space-|md:|lg:|sm:|hover:|focus:)/i;

export type ShipCssMode = 'link' | 'inline';

export type PrepareShippableHtmlResult = {
  html: string;
  css: string;
  usedTailwind: boolean;
  /** True when static compile failed and CDN was kept/restored. */
  fellBackToCdn?: boolean;
};

export function extractClassCandidates(...htmlDocuments: string[]): string[] {
  const set = new Set<string>();
  for (const html of htmlDocuments) {
    CLASS_ATTR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CLASS_ATTR_RE.exec(html)) !== null) {
      for (const token of match[2].split(/\s+/)) {
        const t = token.trim();
        if (t) set.add(t);
      }
    }
  }
  return [...set];
}

export function stripTailwindCdn(html: string): string {
  return html.replace(TAILWIND_CDN_SCRIPT_RE, '').replace(TAILWIND_CONFIG_SCRIPT_RE, '');
}

export function htmlNeedsTailwind(html: string): boolean {
  return (
    /cdn\.tailwindcss\.com|cdn\.jsdelivr\.net\/npm\/tailwindcss/i.test(html) ||
    UTILITY_HINT_RE.test(html)
  );
}

function injectCdnScript(html: string): string {
  if (/cdn\.tailwindcss\.com/i.test(html)) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${TAILWIND_CDN_SCRIPT}\n</head>`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${TAILWIND_CDN_SCRIPT}`);
  }
  return `${TAILWIND_CDN_SCRIPT}\n${html}`;
}

function stylesheetHrefFor(filePath: string): string {
  const normalized = filePath.replace(/^\.?\//, '');
  const depth = normalized.split('/').length - 1;
  if (depth <= 0) return 'styles.css';
  return `${'../'.repeat(depth)}styles.css`;
}

function injectStylesheetLink(html: string, href: string): string {
  if (html.includes('data-niskbuild-ship-css')) return html;
  const link = `<link rel="stylesheet" href="${href}" data-niskbuild-ship-css="1">`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${link}\n</head>`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${link}`);
  }
  return `${link}\n${html}`;
}

function injectInlineCss(html: string, css: string): string {
  if (html.includes('data-niskbuild-ship-css')) return html;
  const style = `<style data-niskbuild-ship-css="1">${css}</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${style}\n</head>`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${style}`);
  }
  return `${style}\n${html}`;
}

/**
 * Compile a static CSS bundle for the given utility class candidates (Tailwind v4).
 * Dynamic-imports @tailwindcss/node so a native/oxide load failure is catchable
 * (static import can crash the whole /api/export module → HTML 500 → client JSON.parse blowup).
 */
export async function compileTailwindCss(candidates: string[]): Promise<string> {
  if (candidates.length === 0) {
    return '/* NiskBuild: no Tailwind utility classes detected */\n';
  }

  const { compile, optimize } = await import('@tailwindcss/node');
  const { build } = await compile('@import "tailwindcss";', {
    base: process.cwd(),
    onDependency() {},
  });
  const raw = build(candidates);
  return optimize(raw, { minify: true }).code;
}

/**
 * Clean HTML, strip Tailwind CDN, compile used utilities to static CSS,
 * and wire the CSS via <link> or an inlined <style>.
 * On compile failure, restores the CDN so the page still styles.
 */
export async function prepareShippableHtml(
  rawHtml: string,
  options: { cssMode: ShipCssMode; filePath?: string } = { cssMode: 'link' }
): Promise<PrepareShippableHtmlResult> {
  const cleaned = cleanGeneratedCode(rawHtml);
  const needsTw = htmlNeedsTailwind(cleaned);

  if (!needsTw) {
    return { html: stripTailwindCdn(cleaned), css: '', usedTailwind: false };
  }

  try {
    const candidates = extractClassCandidates(cleaned);
    const css = await compileTailwindCss(candidates);
    let html = stripTailwindCdn(cleaned);

    if (options.cssMode === 'inline') {
      html = injectInlineCss(html, css);
    } else {
      const href = stylesheetHrefFor(options.filePath || 'index.html');
      html = injectStylesheetLink(html, href);
    }

    return { html, css, usedTailwind: true };
  } catch (err) {
    console.error('[ship-html] Tailwind compile failed; falling back to CDN:', err);
    return {
      html: injectCdnScript(cleaned),
      css: '',
      usedTailwind: true,
      fellBackToCdn: true,
    };
  }
}

/**
 * Prepare a multi-file HTML app for ZIP export: shared styles.css + rewritten pages.
 * On compile failure, keeps/restores CDN on each HTML page so Export still succeeds.
 */
export async function prepareShippableHtmlFiles(
  files: Record<string, string>
): Promise<Record<string, string>> {
  const out: Record<string, string> = { ...files };
  const htmlPaths = Object.keys(out).filter((p) => /\.html?$/i.test(p));
  if (htmlPaths.length === 0) return out;

  const cleanedDocs: Record<string, string> = {};
  let anyNeedsTw = false;
  for (const path of htmlPaths) {
    const cleaned = cleanGeneratedCode(out[path] || '');
    cleanedDocs[path] = cleaned;
    if (htmlNeedsTailwind(cleaned)) anyNeedsTw = true;
  }

  if (!anyNeedsTw) {
    for (const path of htmlPaths) {
      out[path] = stripTailwindCdn(cleanedDocs[path]);
    }
    return out;
  }

  try {
    const candidates = extractClassCandidates(...Object.values(cleanedDocs));
    const css = await compileTailwindCss(candidates);
    out['styles.css'] = css;

    for (const path of htmlPaths) {
      let html = stripTailwindCdn(cleanedDocs[path]);
      html = injectStylesheetLink(html, stylesheetHrefFor(path));
      out[path] = html;
    }
    return out;
  } catch (err) {
    console.error('[ship-html] Tailwind compile failed for ZIP; falling back to CDN:', err);
    for (const path of htmlPaths) {
      out[path] = injectCdnScript(cleanedDocs[path]);
    }
    delete out['styles.css'];
    return out;
  }
}
