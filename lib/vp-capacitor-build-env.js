/**
 * Shared Capacitor / App Store Vite build env for Vagus Planner.
 * Used by export scripts (CommonJS) and TypeScript export pipelines.
 */

const VP_API_BASE_URL_EXPORT_WARNING =
  'WARNING: No API base URL configured — InvokeLLM and other AI features will not work in this build.';

function resolveVpApiBaseUrl() {
  return (
    process.env.VITE_API_BASE_URL?.trim()?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') ||
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
 * @param {boolean} [forExport=true]
 * @returns {{ CAPACITOR_BUILD: string, VITE_API_BASE_URL: string }}
 */
function buildVpCapacitorBuildEnv(forExport = true) {
  warnIfMissingVpApiBaseUrl(forExport);
  return {
    CAPACITOR_BUILD: '1',
    VITE_API_BASE_URL: resolveVpApiBaseUrl(),
  };
}

module.exports = {
  VP_API_BASE_URL_EXPORT_WARNING,
  resolveVpApiBaseUrl,
  warnIfMissingVpApiBaseUrl,
  buildVpCapacitorBuildEnv,
};
