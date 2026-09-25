/**
 * In-browser (and Node) esbuild-wasm bundler for Full App preview.
 * Virtual FS of project files → single ESM bundle; curated deps stay external.
 */

import type { Plugin } from 'esbuild-wasm';
import {
  FULL_APP_PREVIEW_EXTERNALS,
  isAllowedBareImport,
} from '@/lib/full-app-preview/allowlist';

export type FullAppPreviewFiles = Record<string, string>;

export type FullAppBundleResult =
  | {
      ok: true;
      code: string;
      css: string;
      entry: string;
      warnings: string[];
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
    };

const ENTRY_CANDIDATES = [
  'src/main.tsx',
  'src/main.jsx',
  'src/main.ts',
  'src/main.js',
  'src/index.tsx',
  'src/index.jsx',
] as const;

const BARE_IMPORT_RE =
  /(?:from|import)\s*(?:[\s\n]*['"]([^'"]+)['"]|[\s\n]*\(\s*['"]([^'"]+)['"])/g;

function normalizePath(p: string): string {
  return p.replace(/^\.\//, '').replace(/\\/g, '/');
}

export function findPreviewEntry(files: FullAppPreviewFiles): string | null {
  const normalized: FullAppPreviewFiles = {};
  for (const [k, v] of Object.entries(files)) {
    normalized[normalizePath(k)] = v;
  }
  for (const candidate of ENTRY_CANDIDATES) {
    if (normalized[candidate]?.trim()) return candidate;
  }
  return null;
}

/** Collect local CSS referenced from entry graph (simple: all .css in src/). */
export function collectPreviewCss(files: FullAppPreviewFiles): string {
  const parts: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    const n = normalizePath(path);
    if (n.endsWith('.css') && content.trim()) {
      parts.push(`/* ${n} */\n${content}`);
    }
  }
  return parts.join('\n\n');
}

/**
 * Scan source for bare imports outside the allowlist.
 * Relative imports (./ ../) are fine; http(s) rejected.
 * Only app source under src/ (plus root entry candidates) — ignore vite.config etc.
 */
export function findDisallowedImports(files: FullAppPreviewFiles): string[] {
  const bad = new Set<string>();
  for (const [path, content] of Object.entries(files)) {
    const n = normalizePath(path);
    if (!/\.(jsx?|tsx?|mjs|cjs)$/i.test(n)) continue;
    // Tooling configs often import vite plugins — not part of the browser bundle.
    if (/(^|\/)vite\.config\./i.test(n)) continue;
    if (/(^|\/)(eslint|prettier|postcss|tailwind)\.config\./i.test(n)) continue;
    if (!n.startsWith('src/') && !ENTRY_CANDIDATES.includes(n as (typeof ENTRY_CANDIDATES)[number])) {
      continue;
    }
    BARE_IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BARE_IMPORT_RE.exec(content)) !== null) {
      const spec = (m[1] || m[2] || '').trim();
      if (!spec) continue;
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      if (spec.startsWith('http:') || spec.startsWith('https:')) {
        bad.add(spec);
        continue;
      }
      if (!isAllowedBareImport(spec)) bad.add(spec);
    }
  }
  return [...bad].sort();
}

function buildVirtualFsMap(files: FullAppPreviewFiles): Map<string, string> {
  const map = new Map<string, string>();
  for (const [path, content] of Object.entries(files)) {
    const n = normalizePath(path);
    map.set(n, content);
    map.set('/' + n, content);
    map.set('virtual:///' + n, content);
  }
  return map;
}

function resolveRelative(from: string, rel: string): string {
  const fromDir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const parts = (fromDir ? fromDir + '/' + rel : rel).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json', ''];

function lookupFile(fs: Map<string, string>, path: string): string | null {
  const candidates = [
    path,
    ...EXTENSIONS.filter((e) => e).map((e) => path + e),
    path + '/index.tsx',
    path + '/index.ts',
    path + '/index.jsx',
    path + '/index.js',
  ];
  for (const c of candidates) {
    const n = normalizePath(c);
    if (fs.has(n)) return n;
    if (fs.has('/' + n)) return n;
  }
  return null;
}

function virtualFsPlugin(files: FullAppPreviewFiles): Plugin {
  const fs = buildVirtualFsMap(files);

  return {
    name: 'nisk-virtual-fs',
    setup(build) {
      build.onResolve({ filter: /^nisk:preview-nav-bridge$/ }, () => ({
        path: 'nisk:preview-nav-bridge',
        namespace: 'nisk-bridge',
      }));

      build.onLoad({ filter: /.*/, namespace: 'nisk-bridge' }, () => ({
        contents: PREVIEW_NAV_BRIDGE_MODULE,
        loader: 'jsx',
      }));

      build.onResolve({ filter: /.*/ }, (args) => {
        const spec = args.path;

        if (spec === 'nisk:preview-nav-bridge') {
          return { path: spec, namespace: 'nisk-bridge' };
        }

        if (
          FULL_APP_PREVIEW_EXTERNALS.includes(
            spec as (typeof FULL_APP_PREVIEW_EXTERNALS)[number]
          ) ||
          isAllowedBareImport(spec)
        ) {
          return { path: spec, external: true };
        }

        if (spec.startsWith('http:') || spec.startsWith('https:')) {
          return { path: spec, external: true };
        }

        let resolved: string | null = null;
        if (spec.startsWith('.') || spec.startsWith('/')) {
          const importer = args.importer
            ? normalizePath(args.importer.replace(/^virtual:\/\//, ''))
            : '';
          const joined = spec.startsWith('/')
            ? normalizePath(spec)
            : resolveRelative(importer, spec);
          resolved = lookupFile(fs, joined);
        } else if (args.kind === 'entry-point') {
          resolved = lookupFile(fs, normalizePath(spec));
        }

        if (!resolved) {
          return {
            errors: [
              {
                text: `Cannot resolve "${spec}"${args.importer ? ` from ${args.importer}` : ''}`,
              },
            ],
          };
        }

        return { path: resolved, namespace: 'nisk-virtual' };
      });

      build.onLoad({ filter: /.*/, namespace: 'nisk-virtual' }, (args) => {
        const path = normalizePath(args.path);
        let contents = fs.get(path) ?? fs.get('/' + path);
        if (contents == null) {
          return { errors: [{ text: `Missing virtual file: ${path}` }] };
        }

        if (path.endsWith('.css')) {
          // CSS is collected separately into the shell; stub the JS import.
          return { contents: 'export default {};', loader: 'js' };
        }
        if (path.endsWith('.json')) {
          return { contents, loader: 'json' };
        }

        // Blob/sandbox preview cannot safely set location.hash — use MemoryRouter
        // + in-app navigate bridge driven by parent postMessage.
        if (/\.(jsx?|tsx?)$/i.test(path)) {
          contents = injectPreviewNavBridge(contents, path);
        }

        if (path.endsWith('.tsx')) return { contents, loader: 'tsx' };
        if (path.endsWith('.ts')) return { contents, loader: 'ts' };
        if (path.endsWith('.jsx')) return { contents, loader: 'jsx' };
        if (path.endsWith('.js') || path.endsWith('.mjs')) {
          return { contents, loader: 'js' };
        }
        return { contents, loader: 'tsx' };
      });
    },
  };
}

export type EsbuildApi = {
  build: typeof import('esbuild-wasm').build;
};

/**
 * Bundle project files with an already-initialized esbuild-wasm API.
 */
export async function bundleFullAppPreview(
  esbuild: EsbuildApi,
  files: FullAppPreviewFiles
): Promise<FullAppBundleResult> {
  const started = Date.now();
  const entry = findPreviewEntry(files);
  if (!entry) {
    return {
      ok: false,
      error: `No entry file found (tried ${ENTRY_CANDIDATES.join(', ')})`,
      durationMs: Date.now() - started,
    };
  }

  const disallowed = findDisallowedImports(files);
  if (disallowed.length > 0) {
    return {
      ok: false,
      error: `Unsupported package imports (v1 allowlist only): ${disallowed.join(', ')}. Allowed: react, react-dom, react-router-dom.`,
      durationMs: Date.now() - started,
    };
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      jsx: 'automatic',
      jsxImportSource: 'react',
      logLevel: 'silent',
      plugins: [virtualFsPlugin(files)],
      external: [...FULL_APP_PREVIEW_EXTERNALS],
    });

    const outputs = result.outputFiles ?? [];
    const jsOut =
      outputs.find((f) => /\.m?js$/i.test(f.path)) ??
      outputs.find((f) => !/\.map$/i.test(f.path) && f.text.trim().length > 0) ??
      outputs[0];

    if (!jsOut?.text) {
      const paths = outputs.map((f) => `${f.path} (${f.text.length}b)`).join(', ') || '(none)';
      return {
        ok: false,
        error: `esbuild produced no JS output (files: ${paths})`,
        durationMs: Date.now() - started,
      };
    }

    const warnings = (result.warnings ?? []).map((w) => w.text);
    return {
      ok: true,
      code: jsOut.text,
      css: collectPreviewCss(files),
      entry,
      warnings,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'errors' in err
        ? formatEsbuildErrors(err as { errors?: Array<{ text: string }> })
        : err instanceof Error
          ? err.message
          : String(err);
    return {
      ok: false,
      error: message || 'Bundle failed',
      durationMs: Date.now() - started,
    };
  }
}

function formatEsbuildErrors(err: { errors?: Array<{ text: string }> }): string {
  const texts = (err.errors ?? []).map((e) => e.text).filter(Boolean);
  return texts.length ? texts.join('\n') : 'Bundle failed';
}

/** Preview-only rewrite: BrowserRouter/HashRouter → MemoryRouter (blob sandbox can't set location.hash). */
export function rewriteBrowserRouterForPreview(source: string): string {
  return source
    .replace(/\bBrowserRouter\b/g, 'MemoryRouter')
    .replace(/\bHashRouter\b/g, 'MemoryRouter');
}

/** Inject MemoryRouter nav bridge so parent postMessage can call react-router navigate(). */
export function injectPreviewNavBridge(source: string, filePath: string): string {
  const isEntry = /(?:^|\/)main\.(jsx|tsx|js|ts)$/i.test(filePath);
  const hasRouter =
    /<(MemoryRouter|BrowserRouter|HashRouter)\b/.test(source) ||
    /\bMemoryRouter\b/.test(source);

  if (!isEntry && !hasRouter) return source;

  let out = rewriteBrowserRouterForPreview(source);

  if (!out.includes('nisk:preview-nav-bridge')) {
    out = `import { NiskPreviewNavBridge } from "nisk:preview-nav-bridge";\n${out}`;
  }

  if (!out.includes('<NiskPreviewNavBridge')) {
    // Prefer injecting as first child of the router element.
    const replaced = out.replace(
      /<(MemoryRouter)(\s[^>]*)?>/g,
      (match) => `${match}\n      <NiskPreviewNavBridge />`
    );
    if (replaced !== out) {
      out = replaced;
    } else if (isEntry) {
      // Fallback: wrap default export render tree is too risky — leave a runtime hint.
      out += `\n;console.warn("[nisk-preview] Could not inject NiskPreviewNavBridge into Router");\n`;
    }
  }

  return out;
}

export const PREVIEW_NAV_BRIDGE_MODULE = `
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/** Lives inside MemoryRouter — parent posts {type:'niskbuild-preview-nav', action, path? }. */
export function NiskPreviewNavBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const depthRef = useRef(0);
  const stackRef = useRef([location.pathname || "/"]);

  useEffect(() => {
    function report() {
      try {
        const path = location.pathname || "/";
        parent.postMessage({
          type: "niskbuild-preview-history",
          canGoBack: depthRef.current > 0,
          canGoForward: false,
          path,
          ts: Date.now(),
        }, "*");
      } catch (_) {}
    }

    function onMessage(e) {
      const d = e && e.data;
      if (!d || d.type !== "niskbuild-preview-nav") return;
      if (d.action === "goto" && typeof d.path === "string") {
        let p = String(d.path).trim();
        if (!p) return;
        if (p.charAt(0) !== "/") p = "/" + p;
        p = p.split("#")[0].split("?")[0] || "/";
        depthRef.current += 1;
        stackRef.current.push(p);
        navigate(p);
      } else if (d.action === "back") {
        if (depthRef.current > 0) depthRef.current -= 1;
        navigate(-1);
      } else if (d.action === "forward") {
        depthRef.current += 1;
        navigate(1);
      } else if (d.action === "reload") {
        try { window.location.reload(); } catch (_) {}
      }
    }

    window.addEventListener("message", onMessage);
    window.__niskPreviewNavigate = (path) => {
      depthRef.current += 1;
      navigate(path);
    };
    report();
    return () => {
      window.removeEventListener("message", onMessage);
      try { delete window.__niskPreviewNavigate; } catch (_) {}
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    try {
      parent.postMessage({
        type: "niskbuild-preview-history",
        canGoBack: depthRef.current > 0,
        canGoForward: false,
        path: location.pathname || "/",
        ts: Date.now(),
      }, "*");
    } catch (_) {}
  }, [location.pathname]);

  return null;
}
`.trim();
