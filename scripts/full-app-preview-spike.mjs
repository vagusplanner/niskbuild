/**
 * Node smoke for Full App preview bundler (no browser).
 * Run: node --experimental-strip-types scripts/full-app-preview-spike.mjs
 * Or: npx tsx scripts/full-app-preview-spike.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild-wasm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const HELLO = {
  'src/main.jsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
`,
  'src/App.jsx': `export default function App() {
  return <h1>Hello from esbuild-wasm</h1>;
}
`,
  'src/styles.css': `h1 { color: teal; }`,
};

function normalizePath(p) {
  return p.replace(/^\.\//, '').replace(/\\/g, '/');
}

function resolveRelative(from, rel) {
  const fromDir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const parts = (fromDir ? fromDir + '/' + rel : rel).split('/');
  const out = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
];

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json'];

function lookup(fsMap, pathName) {
  const candidates = [
    pathName,
    ...EXTENSIONS.map((e) => pathName + e),
    pathName + '/index.jsx',
    pathName + '/index.js',
  ];
  for (const c of candidates) {
    const n = normalizePath(c);
    if (fsMap.has(n)) return n;
  }
  return null;
}

function virtualPlugin(files) {
  const fsMap = new Map();
  for (const [k, v] of Object.entries(files)) fsMap.set(normalizePath(k), v);

  return {
    name: 'virtual',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (EXTERNALS.includes(args.path) || args.path.startsWith('react')) {
          return { path: args.path, external: true };
        }
        let resolved = null;
        if (args.path.startsWith('.')) {
          const importer = normalizePath(args.importer || '');
          resolved = lookup(fsMap, resolveRelative(importer, args.path));
        } else if (args.kind === 'entry-point') {
          resolved = lookup(fsMap, normalizePath(args.path));
        }
        if (!resolved) {
          return { errors: [{ text: `Cannot resolve ${args.path}` }] };
        }
        return { path: resolved, namespace: 'v' };
      });
      build.onLoad({ filter: /.*/, namespace: 'v' }, (args) => {
        const contents = fsMap.get(normalizePath(args.path));
        if (contents == null) return { errors: [{ text: 'missing ' + args.path }] };
        if (args.path.endsWith('.css')) return { contents: 'export default {}', loader: 'js' };
        if (args.path.endsWith('.jsx')) return { contents, loader: 'jsx' };
        return { contents, loader: 'js' };
      });
    },
  };
}

async function main() {
  // Node entry of esbuild-wasm spawns the wasm binary as a service —
  // do not pass wasmURL/wasmModule (those are browser-only).
  await esbuild.initialize({});

  const t0 = Date.now();
  const result = await esbuild.build({
    entryPoints: ['src/main.jsx'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    logLevel: 'silent',
    plugins: [virtualPlugin(HELLO)],
    external: EXTERNALS,
  });
  const ms = Date.now() - t0;
  const js = result.outputFiles?.[0]?.text ?? '';
  console.log(JSON.stringify({
    ok: true,
    durationMs: ms,
    bytes: js.length,
    hasCreateRoot: js.includes('createRoot') || js.includes('react-dom/client'),
    hasJsxRuntime: js.includes('jsx-runtime') || js.includes('jsx'),
    preview: js.slice(0, 200),
  }, null, 2));

  const outDir = path.join(root, '.tmp-full-app-preview-spike');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bundle.js'), js);
  console.log('Wrote', path.join(outDir, 'bundle.js'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
