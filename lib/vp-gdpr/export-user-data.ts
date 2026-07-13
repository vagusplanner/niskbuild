import type { SupabaseClient } from '@supabase/supabase-js';
import {
  VP_GDPR_ALL_TABLES,
  VP_UPLOADS_BUCKET,
  parseVpGdprConsents,
} from '@/lib/vp-gdpr/tables';

export type VpExportPayload = {
  export_type: 'GDPR_Data_Export';
  export_version: number;
  export_date: string;
  user_profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    created_at: string | null;
  };
  consents: ReturnType<typeof parseVpGdprConsents> | null;
  tables: Record<string, unknown[] | { error: string; skipped?: boolean }>;
  uploads: {
    bucket: string;
    objects: Array<{ path: string; size?: number; updated_at?: string | null }>;
    note: string;
  };
  notes: string[];
};

/**
 * Build a complete personal-data export for a Vagus Planner user.
 * File binary contents are not embedded — only storage object references.
 */
export async function exportVagusPlannerUserData(
  admin: SupabaseClient,
  user: { id: string; email?: string | null; created_at?: string | null; user_metadata?: Record<string, unknown> }
): Promise<VpExportPayload> {
  const notes: string[] = [
    'Binary upload contents are not included; only storage object paths are listed. Download files separately while the account is still active.',
    '[LEGAL REVIEW NEEDED] Confirm this export package satisfies Article 15/20 disclosure requirements for your jurisdiction.',
  ];

  const tables: VpExportPayload['tables'] = {};
  let consents: ReturnType<typeof parseVpGdprConsents> | null = null;

  for (const table of VP_GDPR_ALL_TABLES) {
    try {
      const { data, error } = await admin
        .schema('firstparty')
        .from(table)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        const msg = error.message?.toLowerCase() ?? '';
        if (
          msg.includes('does not exist') ||
          msg.includes('could not find') ||
          msg.includes('schema cache') ||
          error.code === '42P01' ||
          error.code === 'PGRST205'
        ) {
          tables[table] = { error: error.message, skipped: true };
        } else {
          tables[table] = { error: error.message };
        }
        continue;
      }

      const rows = data ?? [];
      tables[table] = rows;

      if (table === 'vp_user_settings' && rows[0]) {
        const row = rows[0] as { preferences?: unknown };
        consents = parseVpGdprConsents(row.preferences);
      }
    } catch (err) {
      tables[table] = {
        error: err instanceof Error ? err.message : 'export failed',
      };
    }
  }

  const uploads = await listUserUploadRefs(admin, user.id);

  return {
    export_type: 'GDPR_Data_Export',
    export_version: 2,
    export_date: new Date().toISOString(),
    user_profile: {
      id: user.id,
      email: user.email ?? null,
      full_name:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
      created_at: user.created_at ?? null,
    },
    consents,
    tables,
    uploads,
    notes,
  };
}

async function listUserUploadRefs(
  admin: SupabaseClient,
  userId: string
): Promise<VpExportPayload['uploads']> {
  const objects: VpExportPayload['uploads']['objects'] = [];
  const prefix = userId;

  try {
    const { data: rootItems } = await admin.storage
      .from(VP_UPLOADS_BUCKET)
      .list(prefix, { limit: 1000 });

    for (const item of rootItems ?? []) {
      if (item.id == null && item.name) {
        const { data: nested } = await admin.storage
          .from(VP_UPLOADS_BUCKET)
          .list(`${prefix}/${item.name}`, { limit: 1000 });
        for (const file of nested ?? []) {
          if (file.name) {
            objects.push({
              path: `${prefix}/${item.name}/${file.name}`,
              size: typeof file.metadata?.size === 'number' ? file.metadata.size : undefined,
              updated_at: file.updated_at ?? null,
            });
          }
        }
      } else if (item.name) {
        objects.push({
          path: `${prefix}/${item.name}`,
          size: typeof item.metadata?.size === 'number' ? item.metadata.size : undefined,
          updated_at: item.updated_at ?? null,
        });
      }
    }

    const { data: filesFolder } = await admin.storage
      .from(VP_UPLOADS_BUCKET)
      .list(`${prefix}/files`, { limit: 1000 });
    for (const file of filesFolder ?? []) {
      if (!file.name) continue;
      const path = `${prefix}/files/${file.name}`;
      if (!objects.some((o) => o.path === path)) {
        objects.push({
          path,
          size: typeof file.metadata?.size === 'number' ? file.metadata.size : undefined,
          updated_at: file.updated_at ?? null,
        });
      }
    }
  } catch {
    // bucket may be absent
  }

  return {
    bucket: VP_UPLOADS_BUCKET,
    objects,
    note: 'Paths only — binary file bytes are not embedded in this JSON export.',
  };
}
