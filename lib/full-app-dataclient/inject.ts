/**
 * Inject / overwrite platform-owned DataClient files into a Full App file map.
 */

import type { ProjectFile } from '@/lib/project-files';
import { iconForProjectPath } from '@/lib/full-app-bundle';
import {
  DATACLIENT_PATH,
  ENV_EXAMPLE_PATH,
  getDataClientScaffoldFiles,
  PATTERN_A_SCHEMA_SQL,
  SCHEMA_SQL_PATH,
  SUPABASE_ADAPTER_PATH,
} from '@/lib/full-app-dataclient/scaffold-files';

const SUPABASE_JS_DEP = '@supabase/supabase-js';
const SUPABASE_JS_RANGE = '^2.49.0';

function ensurePackageJsonDeps(raw: string): string {
  try {
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      [key: string]: unknown;
    };
    const deps = { ...(pkg.dependencies ?? {}) };
    if (!deps[SUPABASE_JS_DEP]) {
      deps[SUPABASE_JS_DEP] = SUPABASE_JS_RANGE;
    }
    // Keep curated UI deps; do not strip others the model added.
    pkg.dependencies = deps;
    return `${JSON.stringify(pkg, null, 2)}\n`;
  } catch {
    return raw;
  }
}

/**
 * Always overwrite DataClient scaffold; ensure package.json has supabase-js;
 * ensure schema.sql exists (Pattern A template if missing).
 */
export function injectDataClientScaffold(
  files: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = { ...files };
  const scaffold = getDataClientScaffoldFiles();
  out[DATACLIENT_PATH] = scaffold[DATACLIENT_PATH];
  out[SUPABASE_ADAPTER_PATH] = scaffold[SUPABASE_ADAPTER_PATH];
  out[ENV_EXAMPLE_PATH] = scaffold[ENV_EXAMPLE_PATH];

  if (typeof out['package.json'] === 'string') {
    out['package.json'] = ensurePackageJsonDeps(out['package.json']);
  }

  const schema = out[SCHEMA_SQL_PATH];
  if (typeof schema !== 'string' || !schema.trim()) {
    out[SCHEMA_SQL_PATH] = PATTERN_A_SCHEMA_SQL;
  }

  return out;
}

export function projectFilesWithDataClientScaffold(
  files: ProjectFile[]
): ProjectFile[] {
  const record: Record<string, string> = {};
  for (const f of files) {
    if (f.path && typeof f.content === 'string') record[f.path] = f.content;
  }
  const injected = injectDataClientScaffold(record);
  return Object.entries(injected)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({
      path,
      name: path.split('/').pop() || path,
      content,
      icon: iconForProjectPath(path),
    }));
}

/** True if path is the only allowed @supabase/supabase-js importer. */
export function isSupabaseAdapterPath(path: string): boolean {
  const n = path.replace(/^\.\//, '').replace(/\\/g, '/');
  return n === SUPABASE_ADAPTER_PATH || n.endsWith('/adapters/supabase.js');
}

/**
 * App source (under src/) must not import @supabase/supabase-js except the adapter.
 */
export function findIllegalSupabaseImports(
  files: Record<string, string>
): string[] {
  const bad: string[] = [];
  const re =
    /(?:from|import)\s*(?:[\s\n]*['"]@supabase\/supabase-js['"]|[\s\n]*\(\s*['"]@supabase\/supabase-js['"])/;
  for (const [path, content] of Object.entries(files)) {
    const n = path.replace(/^\.\//, '').replace(/\\/g, '/');
    if (!/\.(jsx?|tsx?|mjs)$/i.test(n)) continue;
    if (isSupabaseAdapterPath(n)) continue;
    if (!n.startsWith('src/')) continue;
    if (re.test(content)) bad.push(n);
  }
  return bad.sort();
}
