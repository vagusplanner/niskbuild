import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { meetsMinimumAge, NISK_MINIMUM_AGE } from '@/lib/age-gate';

/**
 * Verifies date of birth server-side, then stores only an attestation timestamp.
 * DOB is intentionally not persisted (analytics policy: no exact birthdate).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : '';

  if (!dateOfBirth) {
    return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
  }

  if (!meetsMinimumAge(dateOfBirth, NISK_MINIMUM_AGE)) {
    return NextResponse.json(
      {
        error: `[LEGAL REVIEW NEEDED] You must be at least ${NISK_MINIMUM_AGE} years old to use NiskBuild.`,
        underage: true,
      },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ age_minimum_attested_at: new Date().toISOString() })
    .eq('id', guard.user!.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to save age attestation' }, { status: 500 });
  }

  return NextResponse.json({ success: true, minimumAge: NISK_MINIMUM_AGE });
}
