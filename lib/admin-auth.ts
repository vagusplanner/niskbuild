const DEFAULT_ADMIN_EMAIL = 'sofiane.kemih@gmail.com';

/** Platform-owner audit trail label for support actions (not used for auth). */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}
