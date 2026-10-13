/**
 * Shared Capacitor / App Store Vite build env for Vagus Planner.
 * Used by export scripts (CommonJS) and TypeScript export pipelines.
 */

const fs = require('fs');
const path = require('path');

const VP_API_BASE_URL_EXPORT_WARNING =
  'WARNING: No API base URL configured — InvokeLLM and other AI features will not work in this build.';

const VP_SUPABASE_EXPORT_WARNING =
  'WARNING: No Supabase URL/anon key configured — Vagus Planner client will fail at runtime.';

/** Keys that must prefer clean .env.local over a polluted shell. */
const VP_CAP_ENV_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_REVENUECAT_IOS_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'REVENUECAT_IOS_API_KEY',
];

/**
 * Strip whitespace and wrapping single/double quotes (including nested wraps).
 * @param {unknown} raw
 * @returns {string}
 */
function stripWrappingQuotes(raw) {
  if (raw == null) return '';
  let s = String(raw).trim();
  while (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Parse KEY=VALUE lines from a dotenv-style file (no expansion).
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    if (!k) continue;
    out[k] = stripWrappingQuotes(line.slice(i + 1));
  }
  return out;
}

/**
 * Load root .env.local (preferred) then apps/vagus-planner/.env.local.
 * @returns {Record<string, string>}
 */
function loadVpEnvLocalFiles() {
  const root = path.join(__dirname, '..');
  const merged = {
    ...parseEnvFile(path.join(root, '.env.local')),
    ...parseEnvFile(path.join(root, 'apps', 'vagus-planner', '.env.local')),
  };
  return merged;
}

/**
 * Prefer clean .env.local over process.env for Cap-critical keys, then strip quotes.
 * @param {string} key
 * @param {string[]} [alsoKeys]
 * @returns {string}
 */
function resolveCleanEnv(key, alsoKeys = []) {
  const fromFile = loadVpEnvLocalFiles();
  const candidates = [key, ...alsoKeys];
  for (const k of candidates) {
    const fileVal = stripWrappingQuotes(fromFile[k]);
    if (fileVal) return fileVal;
  }
  for (const k of candidates) {
    const shellVal = stripWrappingQuotes(process.env[k]);
    if (shellVal) return shellVal;
  }
  return '';
}

function resolveVpApiBaseUrl() {
  return (
    resolveCleanEnv('VITE_API_BASE_URL', ['NEXT_PUBLIC_APP_URL']).replace(/\/$/, '') || ''
  );
}

/** Project origin only — strip trailing slash and accidental PostgREST `/rest/v1`. */
function normalizeSupabaseProjectUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return stripWrappingQuotes(raw)
    .replace(/\/$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/$/, '');
}

function supabaseHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Capacitor / Vite must use the same project as the live NiskBuild app.
 * Prefer NEXT_PUBLIC_* (production source of truth) over a stale VITE_* leftover.
 * Both sources prefer .env.local over polluted shell.
 */
function resolveVpSupabaseUrl() {
  const fromNextOnly = normalizeSupabaseProjectUrl(resolveCleanEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const fromViteOnly = normalizeSupabaseProjectUrl(resolveCleanEnv('VITE_SUPABASE_URL'));
  if (
    fromNextOnly &&
    fromViteOnly &&
    supabaseHostname(fromNextOnly) !== supabaseHostname(fromViteOnly)
  ) {
    console.warn(
      `\n⚠️  VITE_SUPABASE_URL (${supabaseHostname(fromViteOnly)}) differs from NEXT_PUBLIC_SUPABASE_URL (${supabaseHostname(fromNextOnly)}).`
    );
    console.warn('   Using NEXT_PUBLIC_SUPABASE_URL for the Capacitor/native bundle.\n');
  }
  return fromNextOnly || fromViteOnly || '';
}

function resolveVpSupabaseAnonKey() {
  const fromNextUrl = normalizeSupabaseProjectUrl(resolveCleanEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const nextAnon = resolveCleanEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (fromNextUrl && nextAnon) return nextAnon;
  return resolveCleanEnv('VITE_SUPABASE_ANON_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
}

/**
 * @param {boolean} [forExport=true] When true, logs a visible warning if the URL is missing.
 */
function warnIfMissingVpApiBaseUrl(forExport = true) {
  if (!forExport || resolveVpApiBaseUrl()) return;
  console.warn(`\n⚠️  ${VP_API_BASE_URL_EXPORT_WARNING}`);
  console.warn('   Set VITE_API_BASE_URL or NEXT_PUBLIC_APP_URL before exporting.\n');
}

/**
 * @param {boolean} [forExport=true] When true, logs a visible warning if credentials are missing.
 */
function warnIfMissingVpSupabaseEnv(forExport = true) {
  if (!forExport || (resolveVpSupabaseUrl() && resolveVpSupabaseAnonKey())) return;
  console.warn(`\n⚠️  ${VP_SUPABASE_EXPORT_WARNING}`);
  console.warn(
    '   Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n'
  );
}

function resolveVpRevenueCatIosApiKey() {
  return resolveCleanEnv('VITE_REVENUECAT_IOS_API_KEY', ['REVENUECAT_IOS_API_KEY']);
}

/**
 * @param {boolean} [forExport=true]
 * @returns {{
 *   CAPACITOR_BUILD: string,
 *   VITE_CAPACITOR_BUILD: string,
 *   VITE_API_BASE_URL: string,
 *   VITE_SUPABASE_URL: string,
 *   VITE_SUPABASE_ANON_KEY: string,
 *   VITE_REVENUECAT_IOS_API_KEY: string,
 * }}
 */
function buildVpCapacitorBuildEnv(forExport = true) {
  warnIfMissingVpApiBaseUrl(forExport);
  warnIfMissingVpSupabaseEnv(forExport);
  const rcKey = resolveVpRevenueCatIosApiKey();
  if (forExport && !rcKey) {
    console.warn(
      '\n⚠️  WARNING: No VITE_REVENUECAT_IOS_API_KEY — Apple IAP will not work in this Cap build.'
    );
    console.warn(
      '   Set VITE_REVENUECAT_IOS_API_KEY (RevenueCat iOS public SDK key) before exporting.\n'
    );
  }
  const env = {
    CAPACITOR_BUILD: '1',
    // Client-visible twin of CAPACITOR_BUILD — used by vp-platform fail-closed iOS IAP gates.
    VITE_CAPACITOR_BUILD: '1',
    VITE_API_BASE_URL: resolveVpApiBaseUrl(),
    VITE_SUPABASE_URL: resolveVpSupabaseUrl(),
    VITE_SUPABASE_ANON_KEY: resolveVpSupabaseAnonKey(),
    VITE_REVENUECAT_IOS_API_KEY: rcKey,
  };
  // Overwrite process.env so nested tools / Vite do not keep polluted shell values.
  for (const k of VP_CAP_ENV_KEYS) {
    if (env[k] != null && env[k] !== '') {
      process.env[k] = env[k];
    }
  }
  return env;
}

/**
 * App Store export must not ship a native bundle with an empty API base URL.
 * @throws {Error}
 */
function requireVpApiBaseUrlForAppStoreExport() {
  const url = resolveVpApiBaseUrl();
  if (!url) {
    throw new Error(
      `${VP_API_BASE_URL_EXPORT_WARNING}\n` +
        'App Store export aborted. Set VITE_API_BASE_URL or NEXT_PUBLIC_APP_URL before exporting.'
    );
  }
  return url;
}

module.exports = {
  VP_API_BASE_URL_EXPORT_WARNING,
  VP_SUPABASE_EXPORT_WARNING,
  stripWrappingQuotes,
  parseEnvFile,
  loadVpEnvLocalFiles,
  resolveVpApiBaseUrl,
  normalizeSupabaseProjectUrl,
  resolveVpSupabaseUrl,
  resolveVpSupabaseAnonKey,
  resolveVpRevenueCatIosApiKey,
  warnIfMissingVpApiBaseUrl,
  warnIfMissingVpSupabaseEnv,
  buildVpCapacitorBuildEnv,
  requireVpApiBaseUrlForAppStoreExport,
};
