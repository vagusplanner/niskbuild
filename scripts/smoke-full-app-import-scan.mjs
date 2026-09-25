/**
 * Regression: allowlist scanner must not treat from('habits') / from('${table}')
 * as package imports. Run: node scripts/smoke-full-app-import-scan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild-wasm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Mirror of collectBareImportSpecs / findDisallowedImports (keep in sync). */
const STATIC_IMPORT_RE =
  /\bimport\s+(?:type\s+)?(?:[\w*\s{},$]+?\s+from\s+)?['"]([^'"]+)['"]/g;
const EXPORT_FROM_RE =
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?\s+from\s+|\{[^}]*\}\s+from\s+)['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function collectBareImportSpecs(source) {
  const specs = [];
  for (const re of [STATIC_IMPORT_RE, EXPORT_FROM_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const spec = (m[1] || '').trim();
      if (spec) specs.push(spec);
    }
  }
  return specs;
}

// --- Unit: exact false-positive cases from the bug report ---
const adapterSnippet = `
import { createClient } from '@supabase/supabase-js';
function notConfigured(op) { return { data: null, error: { message: op } }; }
function from(table) {
  if (!supabase) return Promise.resolve(notConfigured(\`from('\${table}').select\`));
  return supabase.from(table).select();
}
`;

const habitsSnippet = `
import { dataClient } from '../lib/dataClient.js';
export default function Habits() {
  async function load() {
    const { data } = await dataClient.from('habits').select().eq('user_id', user.id);
    setHabits(data || []);
  }
  return null;
}
`;

const adapterSpecs = collectBareImportSpecs(adapterSnippet);
const habitsSpecs = collectBareImportSpecs(habitsSnippet);

console.log('adapter specs:', adapterSpecs);
console.log('habits specs:', habitsSpecs);

assert(
  adapterSpecs.includes('@supabase/supabase-js'),
  'must still detect real @supabase/supabase-js import'
);
assert(
  !adapterSpecs.some((s) => s.includes('${table}') || s === '${table}'),
  `false positive \${table}: ${adapterSpecs.join(',')}`
);
assert(
  !habitsSpecs.includes('habits'),
  `false positive habits: ${habitsSpecs.join(',')}`
);
assert(
  habitsSpecs.every((s) => s.startsWith('.') || s.startsWith('/')),
  'Habits.jsx should only have relative imports'
);
console.log('✓ scanner ignores from(\'habits\') and from(\'${table}\')');

// --- Integration: bundle Pattern A style files (Streakly / Ember habits shape) ---
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

function lookup(fsMap, pathName) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', ''];
  for (const e of extensions) {
    const n = normalizePath(pathName + e);
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
          resolved = lookup(
            fsMap,
            resolveRelative(normalizePath(args.importer || ''), args.path)
          );
        } else if (args.kind === 'entry-point') {
          resolved = lookup(fsMap, normalizePath(args.path));
        }
        if (!resolved) return { errors: [{ text: `Cannot resolve ${args.path}` }] };
        return { path: resolved, namespace: 'virt' };
      });
      build.onLoad({ filter: /.*/, namespace: 'virt' }, (args) => {
        const contents = fsMap.get(normalizePath(args.path));
        if (contents == null) return { errors: [{ text: `missing ${args.path}` }] };
        const loader =
          args.path.endsWith('.jsx') || args.path.endsWith('.tsx') ? 'jsx' : 'js';
        return { contents, loader };
      });
    },
  };
}

const scaffold = fs.readFileSync(
  path.join(root, 'lib/full-app-dataclient/scaffold-files.ts'),
  'utf8'
);
const files = {
  'src/main.jsx': `import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>
);
`,
  'src/App.jsx': `import { Routes, Route, Link } from 'react-router-dom';
import Habits from './pages/Habits.jsx';
export default function App() {
  return (
    <div>
      <Link to="/habits">Habits</Link>
      <Routes>
        <Route path="/habits" element={<Habits />} />
        <Route path="/" element={<h1>Streakly</h1>} />
      </Routes>
    </div>
  );
}
`,
  'src/pages/Habits.jsx': `import { useEffect, useState } from 'react';
import { dataClient } from '../lib/dataClient.js';

export default function Habits() {
  const [habits, setHabits] = useState([]);
  useEffect(() => {
    void dataClient.from('habits').select().then(({ data }) => {
      setHabits(data || []);
    });
  }, []);
  return (
    <ul>
      {habits.map((h) => (
        <li key={h.id}>{h.title}</li>
      ))}
    </ul>
  );
}
`,
  'src/lib/dataClient.js': extractTemplate(scaffold, 'DATACLIENT_SOURCE'),
  'src/lib/adapters/supabase.js': extractTemplate(scaffold, 'SUPABASE_ADAPTER_SOURCE'),
};

// Simulate findDisallowedImports over these files
const ALLOWED = new Set(EXTERNALS);
function findDisallowed(filesMap) {
  const bad = new Set();
  for (const [filePath, content] of Object.entries(filesMap)) {
    if (!filePath.startsWith('src/')) continue;
    for (const spec of collectBareImportSpecs(content)) {
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      if (!ALLOWED.has(spec)) {
        // adapter may import supabase-js
        if (spec === '@supabase/supabase-js' && filePath.includes('adapters/supabase')) {
          continue;
        }
        bad.add(`${spec} (in ${filePath})`);
      }
    }
  }
  return [...bad];
}

const disallowed = findDisallowed(files);
assert(
  disallowed.length === 0,
  `unexpected disallowed: ${disallowed.join(', ')}`
);
console.log('✓ Streakly-shaped files pass allowlist (no ${table}/habits false positives)');

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
assert(js && js.length > 100, 'bundle empty');
assert(js.includes('from') || js.includes('dataClient') || js.length > 500, 'bundle too thin');
console.log(`✓ Streakly-shaped app bundled (${js.length} chars)`);
console.log('SMOKE OK');
