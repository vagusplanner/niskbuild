/**
 * Curated npm packages Full App preview may import.
 * Everything else fails the pre-bundle check with a clear error.
 */

import { isSupabaseAdapterPath } from '@/lib/full-app-dataclient/inject';

/** Pinned versions used in the iframe import map (esm.sh). */
export const FULL_APP_PREVIEW_VENDOR = {
  react: '19.0.0',
  'react-dom': '19.0.0',
  'react-router-dom': '7.1.1',
  /** Adapter-only — UI must not import this directly. */
  '@supabase/supabase-js': '2.49.1',
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
  '@supabase/supabase-js',
] as const;

const ALLOWED = new Set<string>(FULL_APP_PREVIEW_EXTERNALS);

export function isAllowedBareImport(specifier: string): boolean {
  if (ALLOWED.has(specifier)) return true;
  return false;
}

/**
 * Whether a bare import is allowed in this file path.
 * @supabase/supabase-js is only legal inside the platform adapter.
 */
export function isAllowedBareImportInFile(
  specifier: string,
  filePath: string
): boolean {
  if (specifier === '@supabase/supabase-js') {
    return isSupabaseAdapterPath(filePath);
  }
  return isAllowedBareImport(specifier);
}

/** Build import map for the preview iframe shell. */
export function buildPreviewImportMap(): Record<string, string> {
  const {
    react,
    'react-dom': reactDom,
    'react-router-dom': rrd,
    '@supabase/supabase-js': supabaseJs,
  } = FULL_APP_PREVIEW_VENDOR;
  return {
    react: `https://esm.sh/react@${react}`,
    'react/jsx-runtime': `https://esm.sh/react@${react}/jsx-runtime`,
    'react/jsx-dev-runtime': `https://esm.sh/react@${react}/jsx-dev-runtime`,
    'react-dom': `https://esm.sh/react-dom@${reactDom}`,
    'react-dom/client': `https://esm.sh/react-dom@${reactDom}/client`,
    'react-router': `https://esm.sh/react-router@${rrd}`,
    'react-router/dom': `https://esm.sh/react-router@${rrd}/dom`,
    'react-router-dom': `https://esm.sh/react-router-dom@${rrd}?deps=react@${react},react-dom@${reactDom}`,
    '@supabase/supabase-js': `https://esm.sh/@supabase/supabase-js@${supabaseJs}`,
  };
}
