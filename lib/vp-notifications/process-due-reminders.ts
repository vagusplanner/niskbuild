import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/send-email';
import { sendApnsPush } from '@/lib/vp-notifications/apns-push';
import {
  isReminderTypeEnabled,
  mapPrefsRow,
  resolveDeliveryChannel,
  type VpDeliveryChannel,
} from '@/lib/vp-notifications/constants';

export interface ProcessDueRemindersResult {
  processed: number;
  emailed: number;
  pushed: number;
  skipped: number;
  errors: string[];
}

interface DueReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  reminder_type: string;
  scheduled_at: string;
}

async function getUserEmail(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

async function getUserPrefs(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .schema('firstparty')
    .from('vp_user_settings')
    .select(
      'push_notifications_enabled, email_notifications_enabled, prayer_reminders_enabled, task_due_reminders_enabled, event_reminders_enabled'
    )
    .eq('user_id', userId)
    .maybeSingle();

  return mapPrefsRow(data ?? null);
}

async function getDeviceTokens(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string[]> {
  const { data } = await admin
    .schema('firstparty')
    .from('vp_device_tokens')
    .select('push_token')
    .eq('user_id', userId);

  return (data ?? []).map((row) => row.push_token as string).filter(Boolean);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function processDueReminders(limit = 100): Promise<ProcessDueRemindersResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const result: ProcessDueRemindersResult = {
    processed: 0,
    emailed: 0,
    pushed: 0,
    skipped: 0,
    errors: [],
  };

  const { data: due, error } = await admin
    .schema('firstparty')
    .from('vp_reminders')
    .select('id, user_id, title, body, reminder_type, scheduled_at')
    .is('sent_at', null)
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const reminders = (due ?? []) as DueReminder[];

  for (const reminder of reminders) {
    result.processed += 1;

    const prefs = await getUserPrefs(admin, reminder.user_id);
    if (!isReminderTypeEnabled(prefs, reminder.reminder_type)) {
      await admin
        .schema('firstparty')
        .from('vp_reminders')
        .update({ sent_at: now, channel: null })
        .eq('id', reminder.id);
      result.skipped += 1;
      continue;
    }

    const channel = resolveDeliveryChannel(prefs);
    if (!channel) {
      await admin
        .schema('firstparty')
        .from('vp_reminders')
        .update({ sent_at: now, channel: null })
        .eq('id', reminder.id);
      result.skipped += 1;
      continue;
    }

    let emailSent = false;
    let pushSent = false;

    if (channel === 'email' || channel === 'both') {
      const email = await getUserEmail(admin, reminder.user_id);
      if (email) {
        const sendResult = await sendEmail({
          to: email,
          subject: reminder.title,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">${escapeHtml(reminder.title)}</h2>
              <p style="color: #374151; line-height: 1.6;">${escapeHtml(reminder.body)}</p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                Vagus Planner reminder · <a href="https://niskbuild.com/vagus-planner">Open app</a>
              </p>
            </div>
          `,
        });
        emailSent = sendResult.ok;
        if (emailSent) result.emailed += 1;
        else result.errors.push(`Email failed for reminder ${reminder.id}`);
      } else {
        result.errors.push(`No email for user ${reminder.user_id}`);
      }
    }

    if (channel === 'push' || channel === 'both') {
      const tokens = await getDeviceTokens(admin, reminder.user_id);
      if (tokens.length === 0) {
        if (channel === 'push') {
          result.errors.push(`No device tokens for user ${reminder.user_id}`);
        }
      } else {
        for (const token of tokens) {
          const pushResult = await sendApnsPush({
            deviceToken: token,
            title: reminder.title,
            body: reminder.body,
            reminderId: reminder.id,
          });
          if (pushResult.ok) {
            pushSent = true;
          } else if (pushResult.error) {
            result.errors.push(`APNs ${reminder.id}: ${pushResult.error}`);
          }
        }
        if (pushSent) result.pushed += 1;
      }
    }

    const sentChannel: VpDeliveryChannel | null =
      emailSent && pushSent
        ? 'both'
        : emailSent
          ? 'email'
          : pushSent
            ? 'push'
            : null;

    if (sentChannel) {
      await admin
        .schema('firstparty')
        .from('vp_reminders')
        .update({ sent_at: now, channel: sentChannel })
        .eq('id', reminder.id);
    } else {
      result.errors.push(`Nothing delivered for reminder ${reminder.id}`);
    }
  }

  return result;
}
