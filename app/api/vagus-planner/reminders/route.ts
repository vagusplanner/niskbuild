import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { VP_REMINDER_TYPES } from '@/lib/vp-notifications/constants';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('vp_reminders')
    .select('id, title, body, reminder_type, scheduled_at, sent_at, channel, created_at')
    .eq('user_id', guard.user!.id)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to load reminders' }, { status: 500 });
  }

  return NextResponse.json({ reminders: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const reminderBody = typeof body.body === 'string' ? body.body.trim() : '';
  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : '';
  const reminderType =
    typeof body.reminderType === 'string' && VP_REMINDER_TYPES.includes(body.reminderType)
      ? body.reminderType
      : 'general';

  if (!title || !reminderBody || !scheduledAt) {
    return NextResponse.json(
      { error: 'title, body, and scheduledAt are required' },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('vp_reminders')
    .insert({
      user_id: guard.user!.id,
      title,
      body: reminderBody,
      reminder_type: reminderType,
      scheduled_at: scheduledDate.toISOString(),
    })
    .select('id, title, body, reminder_type, scheduled_at, sent_at, channel')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }

  return NextResponse.json({ reminder: data });
}
