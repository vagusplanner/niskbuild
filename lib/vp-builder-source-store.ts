import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  VP_SRC_ROOT,
  readVpSource,
  resolveVpRelativePath,
  writeVpSource,
} from '@/lib/vagus-planner-builder';

const VP_APP_ID = 'vagus-planner';

export async function readVpSourceForUser(
  userId: string,
  relativePath: string
): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('vp_builder_sources')
    .select('content')
    .eq('user_id', userId)
    .eq('app_id', VP_APP_ID)
    .eq('relative_path', relativePath)
    .maybeSingle();

  if (data?.content) return data.content;

  return readVpSource(relativePath);
}

export async function writeVpSourceForUser(
  userId: string,
  relativePath: string,
  content: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('vp_builder_sources')
    .upsert(
      {
        user_id: userId,
        app_id: VP_APP_ID,
        relative_path: relativePath,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,app_id,relative_path' }
    );

  if (error) {
    throw new Error(`Failed to save VP source (${error.message}). Run supabase/vp-builder-sources-migration.sql.`);
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      await writeVpSource(relativePath, content);
    } catch {
      /* local HMR optional */
    }
  }
}

export async function listVpSourceOverrides(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('vp_builder_sources')
    .select('relative_path')
    .eq('user_id', userId)
    .eq('app_id', VP_APP_ID);

  return (data ?? []).map((r) => r.relative_path as string);
}

/** Overlay user-edited files onto a VP src directory before build/deploy. */
export async function applyVpSourcesToDirectory(
  userId: string,
  srcRoot: string
): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('vp_builder_sources')
    .select('relative_path, content')
    .eq('user_id', userId)
    .eq('app_id', VP_APP_ID);

  let count = 0;
  for (const row of data ?? []) {
    const rel = row.relative_path as string;
    const abs = path.join(srcRoot, rel);
    if (!abs.startsWith(path.resolve(srcRoot))) continue;
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, row.content as string, 'utf8');
    count += 1;
  }
  return count;
}

export async function hasVpSourceTable(): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('vp_builder_sources')
    .select('id')
    .limit(1);
  return !error;
}

export { VP_SRC_ROOT, resolveVpRelativePath };
