'use client';

import { useEffect, useState } from 'react';
import Layout from '@/app/components/Layout';
import { createClient } from '@/lib/supabase/client';

type SettingsState = {
  theme: string;
  notifications: boolean;
  language: string;
};

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'light',
  notifications: true,
  language: 'en',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .schema('firstparty')
          .from('vp_user_settings')
          .select('preferences, timezone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching settings:', error);
          return;
        }

        if (data?.preferences && typeof data.preferences === 'object') {
          const prefs = data.preferences as Record<string, unknown>;
          setSettings({
            theme: typeof prefs.theme === 'string' ? prefs.theme : DEFAULT_SETTINGS.theme,
            notifications:
              typeof prefs.notifications === 'boolean'
                ? prefs.notifications
                : DEFAULT_SETTINGS.notifications,
            language:
              typeof prefs.language === 'string' ? prefs.language : DEFAULT_SETTINGS.language,
          });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [supabase]);

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
        <h1 className="text-3xl font-bold mb-6">⚙️ Settings</h1>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-gray-500">Choose your preferred theme</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                {settings.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Notifications</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-500">Enable or disable notifications</p>
              </div>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg transition ${
                  settings.notifications
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {settings.notifications ? '✅ On' : '❌ Off'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Language</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Language</p>
                <p className="text-sm text-gray-500">Choose your preferred language</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, language: e.target.value }))
                }
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
