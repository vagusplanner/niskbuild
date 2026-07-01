import type { User } from '@supabase/supabase-js';

/** VP UI user shape derived from Supabase auth (no base44.auth). */
export type VpAuthUser = User & {
  full_name: string | null;
  profile_picture: string | null;
  role: string;
  created_date: string | null;
};

export function mapSupabaseUserToVpUser(authUser: User | null | undefined): VpAuthUser | null {
  if (!authUser) return null;

  const meta = authUser.user_metadata ?? {};
  const appMeta = authUser.app_metadata ?? {};

  return {
    ...authUser,
    id: authUser.id,
    email: authUser.email,
    full_name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    profile_picture:
      (meta.avatar_url as string | undefined) ?? (meta.profile_picture as string | undefined) ?? null,
    role: (meta.role as string | undefined) ?? (appMeta.role as string | undefined) ?? 'user',
    created_date: authUser.created_at ?? null,
  };
}
