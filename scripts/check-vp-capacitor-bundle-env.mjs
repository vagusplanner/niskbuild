#!/usr/bin/env node
/**
 * Post-build guard for Vagus Planner Capacitor www bundles.
 * Fails (exit 1) if baked VITE_ values are quote-polluted or RC/API shape is wrong.
 *
 * Usage:
 *   node scripts/check-vp-capacitor-bundle-env.mjs [wwwDir ...] [--label=name]
 * Default dirs: mobile/vagus-planner/www
 *
 * Prints (no secrets): build label, API host, Supabase host, RC prefix/length, quotes yes/no.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const EXPECTED_API = 'https://www.niskbuild.com';
const EXPECTED_API_HOST = 'www.niskbuild.com';
const EXPECTED_SB_HOST = 'yjphqwbvqmtwydqkjaup.supabase.co';
const EXPECTED_RC_PREFIX = 'appl_';
const EXPECTED_RC_LEN = 32;

function findMainJs(wwwDir) {
  const assets = path.join(wwwDir, 'assets');
  if (!fs.existsSync(assets)) return null;
  let best = null;
  let bestSize = 0;
  for (const name of fs.readdirSync(assets)) {
    if (!name.startsWith('index-') || !name.endsWith('.js')) continue;
    const p = path.join(assets, name);
    const sz = fs.statSync(p).size;
    if (sz > bestSize) {
      bestSize = sz;
      best = p;
    }
  }
  return best;
}

function grabEnvString(js, key) {
  const re = new RegExp(
    key + ':((?:"(?:\\\\.|[^"\\\\])*")|(?:\'(?:\\\\.|[^\'\\\\])*\'))'
  );
  const m = js.match(re);
  if (!m) return null;
  const lit = m[1];
  try {
    if (lit.startsWith('"')) return JSON.parse(lit);
    return lit.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  } catch {
    return lit.slice(1, -1);
  }
}

function hostOf(url) {
  if (url == null || url === '') return '(missing)';
  try {
    return new URL(String(url)).hostname;
  } catch {
    const m = String(url).match(/https?:\/\/([^/"']+)/);
    return m ? m[1] : '(invalid)';
  }
}

function containsQuote(s) {
  return typeof s === 'string' && (s.includes('"') || s.includes("'"));
}

function checkBundle(wwwDir, label) {
  const main = findMainJs(wwwDir);
  if (!main) {
    return {
      ok: false,
      label,
      error: `no main index-*.js under ${wwwDir}`,
    };
  }
  const js = fs.readFileSync(main, 'utf8');
  const api = grabEnvString(js, 'VITE_API_BASE_URL');
  const sb = grabEnvString(js, 'VITE_SUPABASE_URL');
  const rc = grabEnvString(js, 'VITE_REVENUECAT_IOS_API_KEY');

  const viteKeys = [
    'VITE_API_BASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_REVENUECAT_IOS_API_KEY',
    'VITE_CAPACITOR_BUILD',
  ];
  const quotedKeys = [];
  for (const k of viteKeys) {
    const v = grabEnvString(js, k);
    if (v != null && containsQuote(v)) quotedKeys.push(k);
  }

  const apiExact = api === EXPECTED_API;
  const rcOk =
    typeof rc === 'string' &&
    rc.startsWith(EXPECTED_RC_PREFIX) &&
    rc.length === EXPECTED_RC_LEN &&
    !containsQuote(rc);

  const row = {
    ok: apiExact && quotedKeys.length === 0 && rcOk && !!sb,
    label,
    main: path.basename(main),
    apiHost: hostOf(api),
    apiExact,
    supabaseHost: hostOf(sb),
    rcPrefix: typeof rc === 'string' ? rc.slice(0, 5) : '',
    rcLength: typeof rc === 'string' ? rc.length : 0,
    quotes: quotedKeys.length > 0 || containsQuote(api) || containsQuote(rc) ? 'yes' : 'no',
    quotedKeys,
    errors: [],
  };

  if (!apiExact) {
    row.errors.push(
      `API base must be exactly ${EXPECTED_API} (host=${row.apiHost}, quotes=${containsQuote(api)})`
    );
  }
  if (quotedKeys.length) {
    row.errors.push(`VITE_ values contain quote chars: ${quotedKeys.join(', ')}`);
  }
  if (!rcOk) {
    row.errors.push(
      `RC key must start with ${EXPECTED_RC_PREFIX}, length ${EXPECTED_RC_LEN}, no quotes (prefix=${row.rcPrefix}, len=${row.rcLength})`
    );
  }
  if (hostOf(sb) !== EXPECTED_SB_HOST) {
    // warn in print; still fail if missing, soft-warn hostname mismatch as error for Cap builds
    row.errors.push(`Supabase host expected ${EXPECTED_SB_HOST}, got ${row.supabaseHost}`);
    row.ok = false;
  }

  return row;
}

function printRow(row) {
  console.log(
    [
      row.label,
      `API host=${row.apiHost}`,
      `Supabase host=${row.supabaseHost}`,
      `RC prefix=${row.rcPrefix} length=${row.rcLength}`,
      `quotes=${row.quotes}`,
      row.ok ? 'OK' : 'FAIL',
    ].join(' | ')
  );
  if (row.error) console.error('  ', row.error);
  for (const e of row.errors || []) console.error('  ', e);
}

function main() {
  const args = process.argv.slice(2);
  let labelOverride = null;
  const dirs = [];
  for (const a of args) {
    if (a.startsWith('--label=')) labelOverride = a.slice('--label='.length);
    else dirs.push(path.resolve(a));
  }
  if (!dirs.length) {
    dirs.push(path.join(ROOT, 'mobile', 'vagus-planner', 'www'));
  }

  let failed = false;
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    const label =
      labelOverride && dirs.length === 1
        ? labelOverride
        : labelOverride
          ? `${labelOverride}:${path.basename(dir)}`
          : path.relative(ROOT, dir) || dir;
    const row = checkBundle(dir, label);
    printRow(row);
    if (!row.ok) failed = true;
  }

  if (failed) {
    console.error('\ncheck-vp-capacitor-bundle-env: FAILED');
    process.exit(1);
  }
  console.log('\ncheck-vp-capacitor-bundle-env: OK');
}

main();
