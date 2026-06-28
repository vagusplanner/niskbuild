import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_VP_NOTIFICATION_PREFERENCES,
  mapPrefsRow,
  prefsToDbUpdate,
  type VpNotificationPreferences,
} from '@/lib/vp-notifications/constants';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select(
      'push_notifications_enabled, email_notifications_enabled, prayer_reminders_enabled, task_due_reminders_enabled, event_reminders_enabled'
    )
    .eq('user_id', guard.user!.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ? mapPrefsRow(data) : { ...DEFAULT_VP_NOTIFICATION_PREFERENCES },
  });
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const partial = body.preferences as Partial<VpNotificationPreferences> | undefined;

  if (!partial || typeof partial !== 'object') {
    return NextResponse.json({ error: 'preferences object required' }, { status: 400 });
  }

  const update = prefsToDbUpdate(partial);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid preference fields' }, { status: 400 });
  }

  const supabase = await createClient();
  const userId = guard.user!.id;

  const { data: existing } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .schema('firstparty')
      .from('vp_user_settings')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }
  } else {
    const { error } = await supabase.schema('firstparty').from('vp_user_settings').insert({
      user_id: userId,
      ...update,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
