import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildPlannerDescription,
  dueDateFromInput,
  isShiftPlannerItemType,
} from '@/lib/shift-ai/planner';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const itemType = typeof payload.itemType === 'string' ? payload.itemType : 'homework';
  const dueDateInput = typeof payload.dueDate === 'string' ? payload.dueDate : '';
  const subject = typeof payload.subject === 'string' ? payload.subject : '';
  const notes = typeof payload.notes === 'string' ? payload.notes : '';

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (!isShiftPlannerItemType(itemType)) {
    return NextResponse.json({ error: 'Invalid item type' }, { status: 400 });
  }

  const dueDate = dueDateFromInput(dueDateInput);
  if (!dueDate) {
    return NextResponse.json({ error: 'Valid due date is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .insert({
      student_id: auth.student.id,
      title,
      description: buildPlannerDescription(subject, notes),
      item_type: itemType,
      due_date: dueDate,
      completed: false,
    })
    .select('id, title, description, item_type, due_date, completed')
    .single();

  if (error || !data) {
    console.error('Shift AI planner create failed:', error?.message);
    return NextResponse.json({ error: 'Could not create planner item' }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
