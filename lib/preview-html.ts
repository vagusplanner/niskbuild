/**
 * Sanitize AI-generated HTML before loading in the builder preview iframe.
 * Fixes broken CDN URLs, placeholder assets, and missing CSS custom properties.
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

/** Prepare generated HTML for safe, styled iframe preview. */
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

  return out;
}

/** Sandbox for user-generated preview — scripts required; omit allow-same-origin to block sandbox escape. */
export const BUILDER_PREVIEW_SANDBOX = 'allow-scripts allow-popups allow-forms' as const;
