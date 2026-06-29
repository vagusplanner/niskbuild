'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/app/components/Layout';
import CapacitorPushRegistration from '@/app/vagus-planner/components/notifications/CapacitorPushRegistration';
import type { VpNotificationPreferences } from '@/lib/vp-notifications/constants';

const DEFAULT_PREFS: VpNotificationPreferences = {
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  prayerRemindersEnabled: true,
  taskDueRemindersEnabled: true,
  eventRemindersEnabled: true,
};

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="pr-4">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<VpNotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vagus-planner/notification-preferences');
      if (res.ok) {
        const data = await res.json();
        setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  const updatePref = async (key: keyof VpNotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/vagus-planner/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { [key]: value } }),
      });

      if (res.ok) {
        setSaveMessage('Saved');
      } else {
        setSaveMessage('Failed to save');
        void loadPrefs();
      }
    } catch {
      setSaveMessage('Failed to save');
      void loadPrefs();
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px] pt-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">⚙️ Vagus Planner Settings</h1>
          {saveMessage && (
            <span className="text-sm text-gray-500">{saving ? 'Saving…' : saveMessage}</span>
          )}
        </div>

        <p className="text-xs text-nisk-muted mb-6 p-3 rounded-lg border border-nisk bg-[var(--surface)]/50">
          <strong className="text-[var(--copper-melt)]">Before App Store:</strong> confirm email
          (Resend), push (Capacitor + APNs keys), and{' '}
          <code className="text-[10px]">/api/vagus-planner/reminders</code> cron on a physical device.
        </p>

        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-1">Notification Preferences</h2>
            <p className="text-sm text-gray-500 mb-4">
              Control how Vagus Planner delivers reminders. Push requires the iOS app on a physical
              device; email uses your NiskBuild account address via Resend.
            </p>

            <ToggleRow
              label="Push notifications"
              description="Deliver reminders via Apple Push Notification service (APNs) when the app is installed."
              checked={prefs.pushNotificationsEnabled}
              onChange={(v) => void updatePref('pushNotificationsEnabled', v)}
            />
            <ToggleRow
              label="Email notifications"
              description="Deliver reminders to your account email when push is unavailable."
              checked={prefs.emailNotificationsEnabled}
              onChange={(v) => void updatePref('emailNotificationsEnabled', v)}
            />
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-1">Reminder types</h2>
            <p className="text-sm text-gray-500 mb-4">
              Turn off specific reminder categories without disabling all notifications.
            </p>

            <ToggleRow
              label="Prayer time reminders"
              description="Salah and Islamic schedule alerts."
              checked={prefs.prayerRemindersEnabled}
              onChange={(v) => void updatePref('prayerRemindersEnabled', v)}
            />
            <ToggleRow
              label="Task due reminders"
              description="Due dates and overdue tasks."
              checked={prefs.taskDueRemindersEnabled}
              onChange={(v) => void updatePref('taskDueRemindersEnabled', v)}
            />
            <ToggleRow
              label="Event reminders"
              description="Calendar events and upcoming appointments."
              checked={prefs.eventRemindersEnabled}
              onChange={(v) => void updatePref('eventRemindersEnabled', v)}
            />
          </section>

          <CapacitorPushRegistration />

          <section className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-sm text-amber-900">
            <p className="font-medium mb-1">Before App Store export</p>
            <p>
              Test push on a physical iPhone (simulator cannot receive APNs). Enable Push
              Notifications and Background Modes → Remote notifications in Xcode, then confirm
              device registration in Settings after first launch.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
