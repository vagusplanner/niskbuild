/** Reminder types stored in firstparty.vp_reminders.reminder_type */
export const VP_REMINDER_TYPES = [
  'general',
  'prayer',
  'task_due',
  'event',
  'journal',
] as const;

export type VpReminderType = (typeof VP_REMINDER_TYPES)[number];

export type VpDeliveryChannel = 'email' | 'push' | 'both';

export interface VpNotificationPreferences {
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  prayerRemindersEnabled: boolean;
  taskDueRemindersEnabled: boolean;
  eventRemindersEnabled: boolean;
}

export const DEFAULT_VP_NOTIFICATION_PREFERENCES: VpNotificationPreferences = {
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  prayerRemindersEnabled: true,
  taskDueRemindersEnabled: true,
  eventRemindersEnabled: true,
};

export function resolveDeliveryChannel(prefs: VpNotificationPreferences): VpDeliveryChannel | null {
  const push = prefs.pushNotificationsEnabled;
  const email = prefs.emailNotificationsEnabled;
  if (push && email) return 'both';
  if (push) return 'push';
  if (email) return 'email';
  return null;
}

export function isReminderTypeEnabled(
  prefs: VpNotificationPreferences,
  reminderType: string
): boolean {
  switch (reminderType) {
    case 'prayer':
      return prefs.prayerRemindersEnabled;
    case 'task_due':
      return prefs.taskDueRemindersEnabled;
    case 'event':
      return prefs.eventRemindersEnabled;
    default:
      return true;
  }
}

export function mapPrefsRow(row: Record<string, unknown> | null): VpNotificationPreferences {
  if (!row) return { ...DEFAULT_VP_NOTIFICATION_PREFERENCES };
  return {
    pushNotificationsEnabled: row.push_notifications_enabled !== false,
    emailNotificationsEnabled: row.email_notifications_enabled !== false,
    prayerRemindersEnabled: row.prayer_reminders_enabled !== false,
    taskDueRemindersEnabled: row.task_due_reminders_enabled !== false,
    eventRemindersEnabled: row.event_reminders_enabled !== false,
  };
}

export function prefsToDbUpdate(prefs: Partial<VpNotificationPreferences>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (prefs.pushNotificationsEnabled !== undefined) {
    out.push_notifications_enabled = prefs.pushNotificationsEnabled;
  }
  if (prefs.emailNotificationsEnabled !== undefined) {
    out.email_notifications_enabled = prefs.emailNotificationsEnabled;
  }
  if (prefs.prayerRemindersEnabled !== undefined) {
    out.prayer_reminders_enabled = prefs.prayerRemindersEnabled;
  }
  if (prefs.taskDueRemindersEnabled !== undefined) {
    out.task_due_reminders_enabled = prefs.taskDueRemindersEnabled;
  }
  if (prefs.eventRemindersEnabled !== undefined) {
    out.event_reminders_enabled = prefs.eventRemindersEnabled;
  }
  return out;
}
