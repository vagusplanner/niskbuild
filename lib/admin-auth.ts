/**
 * Inbox for support/contact notifications (Resend `to`).
 * Prefer SUPPORT_EMAIL, then ADMIN_EMAIL, then support@niskbuild.com.
 * Never returns a fake address — that silently drops Resend deliveries.
 */
export function getSupportInboxEmail(): string {
  const support = process.env.SUPPORT_EMAIL?.trim().toLowerCase();
  if (support) return support;
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (admin) return admin;
  return 'support@niskbuild.com';
}

/** Platform-owner audit trail label for support actions (not used for auth). */
export function getAdminEmail(actorEmail?: string | null): string {
  const fromEnv = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  const actor = actorEmail?.trim().toLowerCase();
  if (actor) return actor;
  const support = process.env.SUPPORT_EMAIL?.trim().toLowerCase();
  if (support) return support;
  return 'platform-owner@unknown';
}
