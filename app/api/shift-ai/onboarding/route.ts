import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  isShiftAgeRange,
  isShiftCurriculum,
} from '@/lib/shift-ai/constants';
import { getFavouriteSubjects, parseFavouriteSubjects } from '@/lib/shift-ai/onboarding';
import { deriveKeyStage } from '@/lib/shift-ai/year-group';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const curriculum = typeof payload.curriculum === 'string' ? payload.curriculum : '';
  const yearGroup = typeof payload.yearGroup === 'string' ? payload.yearGroup.trim() : '';
  const ageRange = typeof payload.ageRange === 'string' ? payload.ageRange : '';
  const favouriteSubjects = parseFavouriteSubjects(payload.favouriteSubjects);

  if (!fullName || !yearGroup) {
    return NextResponse.json({ error: 'Name and year group are required' }, { status: 400 });
  }

  if (!isShiftCurriculum(curriculum)) {
    return NextResponse.json({ error: 'Invalid curriculum' }, { status: 400 });
  }

  if (!isShiftAgeRange(ageRange)) {
    return NextResponse.json({ error: 'Invalid age range' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, account_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (getFavouriteSubjects(existing).length > 0) {
      return NextResponse.json({ error: 'Student profile already exists' }, { status: 409 });
    }

    if (favouriteSubjects.length === 0) {
      return NextResponse.json({ error: 'At least one favourite subject is required' }, { status: 400 });
    }

    const { error } = await admin
      .schema('firstparty')
      .from('shift_students')
      .update({ favourite_subjects: favouriteSubjects })
      .eq('id', existing.id);

    if (error) {
      console.error('Shift AI onboarding update failed:', error.message);
      return NextResponse.json({ error: 'Could not save your subjects' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.schema('firstparty').from('shift_students').insert({
    user_id: user.id,
    full_name: fullName,
    curriculum,
    year_group: yearGroup,
    key_stage: deriveKeyStage(yearGroup, curriculum),
    age_range: ageRange,
    favourite_subjects: favouriteSubjects,
    account_type: 'self',
    is_active: true,
    parent_consent_given: false,
  });

  if (error) {
    console.error('Shift AI onboarding insert failed:', error.message);
    return NextResponse.json({ error: 'Could not create student profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
