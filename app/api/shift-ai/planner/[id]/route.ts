import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOwnedPlannerItem, getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, context: RouteContext) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const existing = await getOwnedPlannerItem(auth.student.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'Planner item not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .update({ completed: !existing.completed })
    .eq('id', id)
    .select('id, title, description, item_type, due_date, completed')
    .single();

  if (error || !data) {
    console.error('Shift AI planner toggle failed:', error?.message);
    return NextResponse.json({ error: 'Could not update planner item' }, { status: 500 });
  }

  return NextResponse.json({ item: data, toggledToCompleted: data.completed });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const existing = await getOwnedPlannerItem(auth.student.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'Planner item not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Shift AI planner delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete planner item' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
