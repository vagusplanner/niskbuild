/**
 * Map Supabase auth user → VP UI shape (full_name, role, created_date, etc.)
 * without going through base44.auth wrappers.
 */
export function mapSupabaseUserToVpUser(authUser) {
  if (!authUser) return null;

  const meta = authUser.user_metadata ?? {};
  const appMeta = authUser.app_metadata ?? {};

  // Prefer durable public/meta URLs; photo_storage_path is resolved to a fresh
  // signed URL in base44.auth.me(). Keep photo_url + profile_picture in sync —
  // UserAvatar reads photo_url; older cards read profile_picture.
  const picture =
    meta.photo_url ?? meta.avatar_url ?? meta.profile_picture ?? null;

  return {
    ...authUser,
    id: authUser.id,
    email: authUser.email ?? null,
    full_name:
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      (typeof meta.given_name === 'string' && meta.given_name.trim()) ||
      null,
    profile_picture: picture,
    photo_url: picture,
    photo_storage_path: meta.photo_storage_path ?? meta.avatar_storage_path ?? null,
    role: meta.role ?? appMeta.role ?? 'user',
    created_date: authUser.created_at ?? null,
  };
}
