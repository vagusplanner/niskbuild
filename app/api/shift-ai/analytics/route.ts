import { NextRequest, NextResponse } from 'next/server';
import { buildAnalyticsSnapshot } from '@/lib/shift-ai/analytics';
import type { AnalyticsActivityType, AnalyticsDateRange } from '@/lib/shift-ai/analytics-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

const VALID_RANGES = new Set<AnalyticsDateRange>(['7', '30', '90']);
const VALID_TYPES = new Set<AnalyticsActivityType | 'all'>([
  'all',
  'planner',
  'arcade',
  'flashcards',
  'chat',
  'mastery',
]);

export async function GET(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = request.nextUrl.searchParams;
  const dateRange = (params.get('dateRange') || '30') as AnalyticsDateRange;
  const activityType = (params.get('activityType') || 'all') as AnalyticsActivityType | 'all';

  if (!VALID_RANGES.has(dateRange) || !VALID_TYPES.has(activityType)) {
    return NextResponse.json({ error: 'Invalid filter parameters' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('favourite_subjects')
    .eq('id', auth.student.id)
    .maybeSingle();

  const subjectOptions = (
    Array.isArray(student?.favourite_subjects) ? student.favourite_subjects : []
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const snapshot = await buildAnalyticsSnapshot(
    auth.student.id,
    subjectOptions,
    dateRange,
    activityType
  );

  return NextResponse.json({ snapshot });
}
