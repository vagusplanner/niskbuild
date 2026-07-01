/**
 * Map Supabase auth user → VP UI shape (full_name, role, created_date, etc.)
 * without going through base44.auth wrappers.
 */
export function mapSupabaseUserToVpUser(authUser) {
  if (!authUser) return null;

  const meta = authUser.user_metadata ?? {};
  const appMeta = authUser.app_metadata ?? {};

  return {
    ...authUser,
    id: authUser.id,
    email: authUser.email ?? null,
    full_name: meta.full_name ?? meta.name ?? null,
    profile_picture: meta.avatar_url ?? meta.profile_picture ?? null,
    role: meta.role ?? appMeta.role ?? 'user',
    created_date: authUser.created_at ?? null,
  };
}
