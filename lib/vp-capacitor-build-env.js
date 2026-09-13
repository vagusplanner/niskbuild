/**
 * Shared Capacitor / App Store Vite build env for Vagus Planner.
 * Used by export scripts (CommonJS) and TypeScript export pipelines.
 */

const VP_API_BASE_URL_EXPORT_WARNING =
  'WARNING: No API base URL configured — InvokeLLM and other AI features will not work in this build.';

const VP_SUPABASE_EXPORT_WARNING =
  'WARNING: No Supabase URL/anon key configured — Vagus Planner client will fail at runtime.';

function resolveVpApiBaseUrl() {
  return (
    process.env.VITE_API_BASE_URL?.trim()?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') ||
    ''
  );
}

/** Project origin only — strip trailing slash and accidental PostgREST `/rest/v1`. */
function normalizeSupabaseProjectUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
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
 */
function resolveVpSupabaseUrl() {
  const fromNext = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const fromVite = normalizeSupabaseProjectUrl(process.env.VITE_SUPABASE_URL);
  if (fromNext && fromVite && supabaseHostname(fromNext) !== supabaseHostname(fromVite)) {
    console.warn(
      `\n⚠️  VITE_SUPABASE_URL (${supabaseHostname(fromVite)}) differs from NEXT_PUBLIC_SUPABASE_URL (${supabaseHostname(fromNext)}).`
    );
    console.warn('   Using NEXT_PUBLIC_SUPABASE_URL for the Capacitor/native bundle.\n');
  }
  return fromNext || fromVite || '';
}

function resolveVpSupabaseAnonKey() {
  const fromNextUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (fromNextUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  }
  return process.env.VITE_SUPABASE_ANON_KEY?.trim() || '';
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

/**
 * @param {boolean} [forExport=true]
 * @returns {{
 *   CAPACITOR_BUILD: string,
 *   VITE_API_BASE_URL: string,
 *   VITE_SUPABASE_URL: string,
 *   VITE_SUPABASE_ANON_KEY: string,
 * }}
 */
function buildVpCapacitorBuildEnv(forExport = true) {
  warnIfMissingVpApiBaseUrl(forExport);
  warnIfMissingVpSupabaseEnv(forExport);
  return {
    CAPACITOR_BUILD: '1',
    VITE_API_BASE_URL: resolveVpApiBaseUrl(),
    VITE_SUPABASE_URL: resolveVpSupabaseUrl(),
    VITE_SUPABASE_ANON_KEY: resolveVpSupabaseAnonKey(),
  };
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
  resolveVpApiBaseUrl,
  normalizeSupabaseProjectUrl,
  resolveVpSupabaseUrl,
  resolveVpSupabaseAnonKey,
  warnIfMissingVpApiBaseUrl,
  warnIfMissingVpSupabaseEnv,
  buildVpCapacitorBuildEnv,
  requireVpApiBaseUrlForAppStoreExport,
};
