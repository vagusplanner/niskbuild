import type { SupabaseClient } from '@supabase/supabase-js';
import {
  STORAGE_BUCKET_IMPORTED_APPS,
  STORAGE_BUCKET_PROJECT_EXPORTS,
  importedAppManifestObjectPath,
  importedAppSourceObjectPath,
} from '@/lib/storage/constants';

export type NiskPurgeResult = {
  storage: Record<string, number | string>;
  supportTicketsAnonymized: number;
  supportTicketsDeleted: number;
  escalationsAnonymized: number;
  invitesDeleted: number;
  analyticsSignupDeleted: number;
  appImportsCleaned: number;
  errors: string[];
};

const BUCKET_AVATARS = 'avatars';
const BUCKET_PROJECT_ASSETS = 'project-assets';

/**
 * Immediate GDPR erasure helpers for NiskBuild platform data that would
 * otherwise survive (or leave PII behind) after projects/profiles/auth delete.
 *
 * Does NOT delete prompt_category_stats / usage_events — those rows have no user_id
 * by design (aggregate). [LEGAL REVIEW NEEDED] Whether to offer separate erasure of
 * cohorts on request is a legal/product decision.
 */
export async function purgeNiskBuildUserData(
  admin: SupabaseClient,
  user: { id: string; email: string }
): Promise<NiskPurgeResult> {
  const errors: string[] = [];
  const storage: Record<string, number | string> = {};

  storage[BUCKET_AVATARS] = await purgeStoragePrefix(admin, BUCKET_AVATARS, user.id, errors);
  storage[BUCKET_PROJECT_ASSETS] = await purgeStoragePrefix(
    admin,
    BUCKET_PROJECT_ASSETS,
    user.id,
    errors
  );
  storage[STORAGE_BUCKET_PROJECT_EXPORTS] = await purgeStoragePrefix(
    admin,
    STORAGE_BUCKET_PROJECT_EXPORTS,
    user.id,
    errors
  );

  const appImportsCleaned = await purgeImportedAppsForUser(admin, user.id, errors);
  storage[STORAGE_BUCKET_IMPORTED_APPS] = appImportsCleaned;

  const support = await anonymizeSupportTickets(admin, user, errors);
  const escalationsAnonymized = await anonymizeEscalations(admin, user, errors);
  const invitesDeleted = await deleteInvitesForUser(admin, user, errors);
  const analyticsSignupDeleted = await deleteAnalyticsSignupRecord(admin, user.id, errors);

  return {
    storage,
    supportTicketsAnonymized: support.anonymized,
    supportTicketsDeleted: support.deleted,
    escalationsAnonymized,
    invitesDeleted,
    analyticsSignupDeleted,
    appImportsCleaned,
    errors,
  };
}

async function purgeStoragePrefix(
  admin: SupabaseClient,
  bucket: string,
  userId: string,
  errors: string[]
): Promise<number> {
  try {
    const paths = await listAllUnderPrefix(admin, bucket, userId);
    if (paths.length === 0) return 0;
    let deleted = 0;
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) {
        errors.push(`${bucket}: ${error.message}`);
      } else {
        deleted += chunk.length;
      }
    }
    return deleted;
  } catch (err) {
    errors.push(
      `${bucket}: ${err instanceof Error ? err.message : 'storage purge failed'}`
    );
    return 0;
  }
}

async function listAllUnderPrefix(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const queue = [prefix];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { data, error } = await admin.storage.from(bucket).list(current, { limit: 1000 });
    if (error || !data) continue;

    for (const item of data) {
      if (!item.name) continue;
      const full = current ? `${current}/${item.name}` : item.name;
      // Folders often have id === null in Supabase storage list
      if (item.id == null && !item.metadata) {
        queue.push(full);
      } else {
        paths.push(full);
      }
    }
  }

  return paths;
}

async function purgeImportedAppsForUser(
  admin: SupabaseClient,
  userId: string,
  errors: string[]
): Promise<number> {
  let cleaned = 0;
  try {
    const { data: imports, error } = await admin
      .schema('firstparty')
      .from('app_imports')
      .select('id, slug, storage_path')
      .eq('imported_by', userId);

    if (error) {
      if (!error.message?.toLowerCase().includes('does not exist')) {
        errors.push(`app_imports: ${error.message}`);
      }
      return 0;
    }

    for (const row of imports ?? []) {
      const slug = typeof row.slug === 'string' ? row.slug : null;
      if (slug) {
        const objects = [
          importedAppSourceObjectPath(slug),
          importedAppManifestObjectPath(slug),
        ];
        if (typeof row.storage_path === 'string' && row.storage_path.trim()) {
          objects.push(row.storage_path.trim());
        }
        const { error: removeError } = await admin.storage
          .from(STORAGE_BUCKET_IMPORTED_APPS)
          .remove([...new Set(objects)]);
        if (removeError) {
          errors.push(`imported-apps/${slug}: ${removeError.message}`);
        }
      }
      const { error: delError } = await admin
        .schema('firstparty')
        .from('app_imports')
        .delete()
        .eq('id', row.id);
      if (delError) {
        errors.push(`app_imports delete: ${delError.message}`);
      } else {
        cleaned += 1;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'app_imports purge failed');
  }
  return cleaned;
}

async function anonymizeSupportTickets(
  admin: SupabaseClient,
  user: { id: string; email: string },
  errors: string[]
): Promise<{ anonymized: number; deleted: number }> {
  let anonymized = 0;
  let deleted = 0;
  try {
    const email = user.email.trim().toLowerCase();

    const { data: byUser } = await admin
      .from('support_tickets')
      .select('id')
      .eq('user_id', user.id);

    const { data: byEmail } = await admin
      .from('support_tickets')
      .select('id')
      .ilike('email', email);

    const ids = new Set<string>();
    for (const row of [...(byUser ?? []), ...(byEmail ?? [])]) {
      if (row.id) ids.add(row.id);
    }

    for (const id of ids) {
      const { error: msgError } = await admin
        .from('support_messages')
        .update({
          sender_email: null,
          body: '[REDACTED — account deleted]',
        })
        .eq('ticket_id', id);

      if (msgError) {
        // older schemas may not allow null sender_email
        await admin
          .from('support_messages')
          .update({
            sender_email: 'redacted@deleted.local',
            body: '[REDACTED — account deleted]',
          })
          .eq('ticket_id', id);
      }

      const { error } = await admin
        .from('support_tickets')
        .update({
          email: 'redacted@deleted.local',
          name: '[deleted]',
          user_id: null,
          subject: '[REDACTED]',
        })
        .eq('id', id);

      if (error) {
        errors.push(`support_tickets ${id}: ${error.message}`);
      } else {
        anonymized += 1;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'support purge failed');
  }
  return { anonymized, deleted };
}

async function anonymizeEscalations(
  admin: SupabaseClient,
  user: { id: string; email: string },
  errors: string[]
): Promise<number> {
  let count = 0;
  try {
    const { data: byUser } = await admin
      .from('agent_escalations')
      .select('id')
      .eq('user_id', user.id);
    const { data: byEmail } = await admin
      .from('agent_escalations')
      .select('id')
      .ilike('user_email', user.email.trim());

    const ids = new Set<string>();
    for (const row of [...(byUser ?? []), ...(byEmail ?? [])]) {
      if (row.id) ids.add(row.id);
    }

    for (const id of ids) {
      const { error } = await admin
        .from('agent_escalations')
        .update({
          user_id: null,
          user_email: 'redacted@deleted.local',
          message: '[REDACTED — account deleted]',
          conversation_history: [],
        })
        .eq('id', id);
      if (error) {
        errors.push(`agent_escalations ${id}: ${error.message}`);
      } else {
        count += 1;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'escalations purge failed');
  }
  return count;
}

async function deleteInvitesForUser(
  admin: SupabaseClient,
  user: { id: string; email: string },
  errors: string[]
): Promise<number> {
  let count = 0;
  try {
    const email = user.email.trim().toLowerCase();

    // Invites sent TO this user (invitee email) — invited_by cascade only covers inviter deletes
    const { data: asInvitee, error: e1 } = await admin
      .from('organization_invites')
      .delete()
      .ilike('email', email)
      .select('id');

    if (e1) {
      errors.push(`organization_invites invitee: ${e1.message}`);
    } else {
      count += asInvitee?.length ?? 0;
    }

    // Invites sent BY this user (if profile cascade hasn't run yet)
    const { data: asInviter, error: e2 } = await admin
      .from('organization_invites')
      .delete()
      .eq('invited_by', user.id)
      .select('id');

    if (e2) {
      errors.push(`organization_invites inviter: ${e2.message}`);
    } else {
      count += asInviter?.length ?? 0;
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'invites purge failed');
  }
  return count;
}

async function deleteAnalyticsSignupRecord(
  admin: SupabaseClient,
  userId: string,
  errors: string[]
): Promise<number> {
  try {
    const { data, error } = await admin
      .from('analytics_signup_recorded')
      .delete()
      .eq('user_id', userId)
      .select('user_id');
    if (error) {
      if (!error.message?.toLowerCase().includes('does not exist')) {
        errors.push(`analytics_signup_recorded: ${error.message}`);
      }
      return 0;
    }
    return data?.length ?? 0;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'analytics_signup purge failed');
    return 0;
  }
}
