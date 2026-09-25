/**
 * Bundle Pattern A (auth + habits DataClient) with esbuild-wasm — self-contained.
 * Run: node scripts/smoke-full-app-pattern-a-bundle.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild-wasm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/** Extract export const NAME = `...`; template from scaffold-files.ts */
function extractTemplate(src, exportName) {
  const marker = `export const ${exportName} = \``;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`missing ${exportName}`);
  let i = start + marker.length;
  let out = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) {
      out += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') break;
    out += ch;
    i += 1;
  }
  return out;
}

function normalizePath(p) {
  return p.replace(/^\.\//, '').replace(/\\/g, '/');
}

function resolveRelative(from, rel) {
  const fromDir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  const parts = (fromDir ? `${fromDir}/${rel}` : rel).split('/');
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
  'react-router',
  'react-router/dom',
  'react-router-dom',
  '@supabase/supabase-js',
];

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json', ''];

function lookup(fsMap, pathName) {
  const candidates = [
    pathName,
    ...EXTENSIONS.filter(Boolean).map((e) => pathName + e),
    `${pathName}/index.jsx`,
    `${pathName}/index.js`,
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
        return { path: resolved, namespace: 'virt' };
      });

      build.onLoad({ filter: /.*/, namespace: 'virt' }, (args) => {
        const contents = fsMap.get(normalizePath(args.path));
        if (contents == null) {
          return { errors: [{ text: `missing ${args.path}` }] };
        }
        const loader = args.path.endsWith('.css')
          ? 'css'
          : args.path.endsWith('.json')
            ? 'json'
            : args.path.endsWith('.tsx') || args.path.endsWith('.jsx')
              ? 'jsx'
              : 'js';
        return { contents, loader };
      });
    },
  };
}

const appFiles = {
  'src/main.jsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { dataClient } from './lib/dataClient.js';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App clientReady={dataClient.isConfigured} />
    </BrowserRouter>
  </StrictMode>
);
`,
  'src/App.jsx': `import { Routes, Route, Link } from 'react-router-dom';
import { dataClient } from './lib/dataClient.js';
export default function App({ clientReady }) {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/habits">Habits</Link>
      </nav>
      <p data-testid="configured">{String(clientReady)}</p>
      <Routes>
        <Route path="/" element={<h1>Ember Habits</h1>} />
        <Route
          path="/habits"
          element={
            <button
              type="button"
              onClick={() =>
                void dataClient.from('habits').select().then(() => {})
              }
            >
              Load
            </button>
          }
        />
      </Routes>
    </div>
  );
}
`,
};

const scaffoldSrc = read('lib/full-app-dataclient/scaffold-files.ts');
const dataClientSrc = extractTemplate(scaffoldSrc, 'DATACLIENT_SOURCE');
const adapterSrc = extractTemplate(scaffoldSrc, 'SUPABASE_ADAPTER_SOURCE');
const files = {
  ...appFiles,
  'src/lib/dataClient.js': dataClientSrc,
  'src/lib/adapters/supabase.js': adapterSrc,
};

if (!adapterSrc.includes('@supabase/supabase-js')) {
  throw new Error('adapter must import @supabase/supabase-js');
}
if (appFiles['src/App.jsx'].includes('@supabase/supabase-js')) {
  throw new Error('UI must not import supabase-js');
}
console.log('✓ scaffold extracted; UI uses dataClient only');

const wasmPath = path.join(root, 'node_modules/esbuild-wasm/esbuild.wasm');
// Node entry of esbuild-wasm — do not pass wasmURL (browser-only).
await esbuild.initialize({});

const result = await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  logLevel: 'silent',
  plugins: [virtualPlugin(files)],
  external: EXTERNALS,
});

const js = result.outputFiles?.[0]?.text;
if (!js) throw new Error('no bundle output');
console.log(`✓ Pattern A DataClient bundle ok (${js.length} chars)`);

const outDir = path.join(root, '.tmp-full-app-smoke');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pattern-a-dataclient-bundle.js'), js);
console.log('wrote .tmp-full-app-smoke/pattern-a-dataclient-bundle.js');
