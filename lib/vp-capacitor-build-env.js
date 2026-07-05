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

function resolveVpSupabaseUrl() {
  return (
    process.env.VITE_SUPABASE_URL?.trim()?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, '') ||
    ''
  );
}

function resolveVpSupabaseAnonKey() {
  return (
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  );
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

module.exports = {
  VP_API_BASE_URL_EXPORT_WARNING,
  VP_SUPABASE_EXPORT_WARNING,
  resolveVpApiBaseUrl,
  resolveVpSupabaseUrl,
  resolveVpSupabaseAnonKey,
  warnIfMissingVpApiBaseUrl,
  warnIfMissingVpSupabaseEnv,
  buildVpCapacitorBuildEnv,
};
