const DEFAULT_ADMIN_EMAIL = 'sofiane.kemih@gmail.com';

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  const normalized = user.email.trim().toLowerCase();
  const admin =
    typeof window === 'undefined'
      ? getAdminEmail()
      : (process.env.NEXT_PUBLIC_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  return normalized === admin;
}
