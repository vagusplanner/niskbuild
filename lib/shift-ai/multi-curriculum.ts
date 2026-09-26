/**
 * Household multi-curriculum eligibility for the SuperEduc8 coupon.
 * Eligible when the billed household has 2+ distinct curricula.
 */

import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

function normalizeCurriculum(raw: string | null | undefined): string | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return v || null;
}

/**
 * Resolve distinct curricula for the household tied to `userId`:
 * - the student's own row (user_id)
 * - siblings sharing the same parent_email (supervised/family)
 * - students whose parent_email matches the billing user's profile email
 */
export async function resolveHouseholdCurricula(
  admin: AdminClient,
  userId: string
): Promise<string[]> {
  const curricula = new Set<string>();

  const { data: ownStudents } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('curriculum, parent_email')
    .eq('user_id', userId);

  const parentEmails = new Set<string>();
  for (const row of ownStudents ?? []) {
    const c = normalizeCurriculum(row.curriculum);
    if (c) curricula.add(c);
    if (typeof row.parent_email === 'string' && row.parent_email.trim()) {
      parentEmails.add(row.parent_email.trim().toLowerCase());
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (typeof profile?.email === 'string' && profile.email.trim()) {
    parentEmails.add(profile.email.trim().toLowerCase());
  }

  // Also check auth email via profiles only (admin auth lookup is heavier)

  for (const email of parentEmails) {
    const { data: household } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('curriculum')
      .ilike('parent_email', email);

    for (const row of household ?? []) {
      const c = normalizeCurriculum(row.curriculum);
      if (c) curricula.add(c);
    }
  }

  return [...curricula];
}

export async function isMultiCurriculumEligible(
  admin: AdminClient,
  userId: string
): Promise<{ eligible: boolean; curricula: string[] }> {
  const curricula = await resolveHouseholdCurricula(admin, userId);
  return { eligible: curricula.length >= 2, curricula };
}
