import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isShiftCurriculum, normalizeEmail } from '@/lib/shift-ai/constants';
import { parseFavouriteSubjects } from '@/lib/shift-ai/onboarding';
import { defaultAgeRangeForAccount, deriveKeyStage } from '@/lib/shift-ai/year-group';
import { sendParentalConsentRequestEmail } from '@/lib/shift-ai/emails';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const childFirstName =
    typeof payload.childFirstName === 'string' ? payload.childFirstName.trim() : '';
  const yearGroup = typeof payload.yearGroup === 'string' ? payload.yearGroup.trim() : '';
  const curriculum = typeof payload.curriculum === 'string' ? payload.curriculum : '';
  const parentEmailRaw =
    typeof payload.parentEmail === 'string' ? payload.parentEmail.trim() : '';
  const accountType = payload.accountType === 'family' ? 'family' : 'supervised';
  const favouriteSubjects = parseFavouriteSubjects(payload.favouriteSubjects);

  if (!childFirstName || !yearGroup || !parentEmailRaw) {
    return NextResponse.json(
      { error: 'Child name, year group, and parent email are required' },
      { status: 400 }
    );
  }

  if (!isShiftCurriculum(curriculum)) {
    return NextResponse.json({ error: 'Invalid curriculum' }, { status: 400 });
  }

  const parentEmail = normalizeEmail(parentEmailRaw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return NextResponse.json({ error: 'Invalid parent email' }, { status: 400 });
  }

  const admin = createAdminClient();
  const ageRange = defaultAgeRangeForAccount(accountType);

  const { data: student, error: studentError } = await admin
    .schema('firstparty')
    .from('shift_students')
    .insert({
      user_id: null,
      full_name: childFirstName,
      curriculum,
      year_group: yearGroup,
      key_stage: deriveKeyStage(yearGroup, curriculum),
      age_range: ageRange,
      parent_email: parentEmail,
      account_type: accountType,
      is_active: false,
      parent_consent_given: false,
      favourite_subjects: favouriteSubjects,
    })
    .select('id')
    .single();

  if (studentError || !student) {
    console.error('Shift AI supervised student insert failed:', studentError?.message);
    return NextResponse.json({ error: 'Could not create pending student profile' }, { status: 500 });
  }

  const { data: consentRequest, error: consentError } = await admin
    .schema('firstparty')
    .from('shift_parent_consent_requests')
    .insert({
      student_id: student.id,
      parent_email: parentEmail,
    })
    .select('consent_token')
    .single();

  if (consentError || !consentRequest?.consent_token) {
    console.error('Shift AI consent request insert failed:', consentError?.message);
    await admin.schema('firstparty').from('shift_students').delete().eq('id', student.id);
    return NextResponse.json({ error: 'Could not create consent request' }, { status: 500 });
  }

  const emailResult = await sendParentalConsentRequestEmail({
    parentEmail,
    childFirstName,
    consentToken: consentRequest.consent_token,
  });

  if (!emailResult.ok) {
    console.error('Shift AI consent email failed:', emailResult.error);
  }

  return NextResponse.json({
    ok: true,
    message:
      'We emailed the parent a consent link. The account stays inactive until they approve.',
    emailSent: emailResult.ok,
  });
}
