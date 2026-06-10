import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — server-only. Never import from client components.
 */
function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is required for server admin operations'
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAdminClientOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
