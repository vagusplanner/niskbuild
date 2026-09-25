/**
 * Curated npm packages Full App preview may import.
 * Everything else fails the pre-bundle check with a clear error.
 */

/** Pinned versions used in the iframe import map (esm.sh). */
export const FULL_APP_PREVIEW_VENDOR = {
  react: '19.0.0',
  'react-dom': '19.0.0',
  'react-router-dom': '7.1.1',
} as const;

/** Bare specifiers treated as external (loaded via import map). */
export const FULL_APP_PREVIEW_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-router',
  'react-router/dom',
  'react-router-dom',
] as const;

const ALLOWED = new Set<string>(FULL_APP_PREVIEW_EXTERNALS);

export function isAllowedBareImport(specifier: string): boolean {
  if (ALLOWED.has(specifier)) return true;
  // Subpath of an allowlisted package (e.g. react-dom/server — still reject non-listed)
  return false;
}

/** Build import map for the preview iframe shell. */
export function buildPreviewImportMap(): Record<string, string> {
  const { react, 'react-dom': reactDom, 'react-router-dom': rrd } =
    FULL_APP_PREVIEW_VENDOR;
  return {
    react: `https://esm.sh/react@${react}`,
    'react/jsx-runtime': `https://esm.sh/react@${react}/jsx-runtime`,
    'react/jsx-dev-runtime': `https://esm.sh/react@${react}/jsx-dev-runtime`,
    'react-dom': `https://esm.sh/react-dom@${reactDom}`,
    'react-dom/client': `https://esm.sh/react-dom@${reactDom}/client`,
    'react-router': `https://esm.sh/react-router@${rrd}`,
    'react-router/dom': `https://esm.sh/react-router@${rrd}/dom`,
    'react-router-dom': `https://esm.sh/react-router-dom@${rrd}?deps=react@${react},react-dom@${reactDom}`,
  };
}
