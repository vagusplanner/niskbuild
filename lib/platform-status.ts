import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  statusLabel,
  type PlatformStatusValue,
} from '@/lib/platform-status-labels';

export type { PlatformStatusValue };
export { statusLabel };

export type PlatformStatusSnapshot = {
  status: PlatformStatusValue;
  updatedAt: string | null;
  updatedBy: string | null;
  updates: Array<{
    id: string;
    body: string;
    createdAt: string;
    createdBy: string | null;
  }>;
};

export function isPlatformStatusValue(v: unknown): v is PlatformStatusValue {
  return v === 'operational' || v === 'degraded' || v === 'down';
}

export async function getPlatformStatusSnapshot(): Promise<PlatformStatusSnapshot> {
  const admin = createAdminClient();

  const [{ data: row }, { data: updates }] = await Promise.all([
    admin.from('platform_status').select('status, updated_at, updated_by').eq('id', 1).maybeSingle(),
    admin
      .from('status_updates')
      .select('id, body, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const status = isPlatformStatusValue(row?.status) ? row.status : 'operational';

  return {
    status,
    updatedAt: (row?.updated_at as string) || null,
    updatedBy: (row?.updated_by as string) || null,
    updates: (updates ?? []).map((u) => ({
      id: u.id as string,
      body: u.body as string,
      createdAt: u.created_at as string,
      createdBy: (u.created_by as string) || null,
    })),
  };
}
