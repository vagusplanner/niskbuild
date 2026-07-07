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
