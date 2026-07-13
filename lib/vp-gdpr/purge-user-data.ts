import type { SupabaseClient } from '@supabase/supabase-js';
import {
  VP_GDPR_ALL_TABLES,
  VP_UPLOADS_BUCKET,
} from '@/lib/vp-gdpr/tables';

export type VpPurgeResult = {
  tablesDeleted: Record<string, number | 'skipped' | 'error'>;
  uploadsDeleted: number;
  uploadsErrors: string[];
};

/**
 * Hard-delete all known firstparty.vp_* personal data for a user, plus uploads.
 *
 * Privacy policy currently claims deletion/anonymisation within 30 days of account
 * deletion. Immediate purge satisfies that outer bound. A soft-delete / 30-day
 * grace period would be a separate legal/product decision — not implemented here.
 */
export async function purgeVagusPlannerUserData(
  admin: SupabaseClient,
  userId: string
): Promise<VpPurgeResult> {
  const tablesDeleted: VpPurgeResult['tablesDeleted'] = {};

  for (const table of VP_GDPR_ALL_TABLES) {
    try {
      const { data, error } = await admin
        .schema('firstparty')
        .from(table)
        .delete()
        .eq('user_id', userId)
        .select('id');

      if (error) {
        // Undefined table / missing column → skip (optional tables may not exist)
        const msg = error.message?.toLowerCase() ?? '';
        if (
          msg.includes('does not exist') ||
          msg.includes('could not find') ||
          msg.includes('schema cache') ||
          error.code === '42P01' ||
          error.code === 'PGRST205'
        ) {
          tablesDeleted[table] = 'skipped';
        } else {
          console.error(`VP GDPR purge failed for ${table}:`, error);
          tablesDeleted[table] = 'error';
        }
        continue;
      }

      tablesDeleted[table] = Array.isArray(data) ? data.length : 0;
    } catch (err) {
      console.error(`VP GDPR purge exception for ${table}:`, err);
      tablesDeleted[table] = 'error';
    }
  }

  const { uploadsDeleted, uploadsErrors } = await purgeUserUploads(admin, userId);

  return { tablesDeleted, uploadsDeleted, uploadsErrors };
}

async function purgeUserUploads(
  admin: SupabaseClient,
  userId: string
): Promise<{ uploadsDeleted: number; uploadsErrors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  const prefix = `${userId}`;

  try {
    const { data: rootItems, error: listError } = await admin.storage
      .from(VP_UPLOADS_BUCKET)
      .list(prefix, { limit: 1000 });

    if (listError) {
      // Bucket may not exist in every env
      if (!listError.message?.toLowerCase().includes('not found')) {
        errors.push(listError.message);
      }
      return { uploadsDeleted: 0, uploadsErrors: errors };
    }

    const paths: string[] = [];

    for (const item of rootItems ?? []) {
      if (item.id == null && item.name) {
        // folder under user prefix (e.g. files/)
        const { data: nested } = await admin.storage
          .from(VP_UPLOADS_BUCKET)
          .list(`${prefix}/${item.name}`, { limit: 1000 });
        for (const file of nested ?? []) {
          if (file.name) paths.push(`${prefix}/${item.name}/${file.name}`);
        }
      } else if (item.name) {
        paths.push(`${prefix}/${item.name}`);
      }
    }

    // Also try the documented files/ subfolder explicitly
    const { data: filesFolder } = await admin.storage
      .from(VP_UPLOADS_BUCKET)
      .list(`${prefix}/files`, { limit: 1000 });
    for (const file of filesFolder ?? []) {
      if (file.name) {
        const p = `${prefix}/files/${file.name}`;
        if (!paths.includes(p)) paths.push(p);
      }
    }

    if (paths.length === 0) {
      return { uploadsDeleted: 0, uploadsErrors: errors };
    }

    // Remove in chunks
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: removeError } = await admin.storage.from(VP_UPLOADS_BUCKET).remove(chunk);
      if (removeError) {
        errors.push(removeError.message);
      } else {
        deleted += chunk.length;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'upload purge failed');
  }

  return { uploadsDeleted: deleted, uploadsErrors: errors };
}
