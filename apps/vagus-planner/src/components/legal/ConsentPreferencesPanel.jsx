import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Moon, Heart, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44, supabase } from '@/api/base44Client';
import {
  parseConsentsFromSettings,
  saveGdprConsents,
  hasCompletedLegalConsent,
} from '@/lib/gdpr-consent';
import { createPageUrl } from '@/utils';

/**
 * Account → Privacy & Consent: view/withdraw consents (esp. Article 9).
 */
export default function ConsentPreferencesPanel({ userEmail }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list ?? [];
    },
  });

  const consents = useMemo(
    () => parseConsentsFromSettings(settingsData?.[0]),
    [settingsData]
  );

  const updateConsent = async (patch) => {
    setSaving(true);
    try {
      await saveGdprConsents(patch, { email: userEmail });
      await queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Consent preferences updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update consent preferences');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${apiBase}/api/vagus-planner/gdpr/export`, {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const payload = await res.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VagusPlanner_Data_Export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-teal-600" />
            Privacy &amp; Consent
          </CardTitle>
          <CardDescription>
            [LEGAL REVIEW NEEDED] Review what you have agreed to. Withdrawing Article 9 consent
            stops future AI processing of that category (Groq). Core non-AI features may still work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Legal acceptance:</span>{' '}
              {hasCompletedLegalConsent(consents) ? 'Recorded' : 'Incomplete'}
            </p>
            {consents.accepted_at && (
              <p className="text-slate-500 text-xs">Accepted at: {consents.accepted_at}</p>
            )}
            {consents.date_of_birth && (
              <p className="text-slate-500 text-xs">
                Date of birth on file (self-attested): {consents.date_of_birth}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Terms: {consents.terms_accepted ? 'yes' : 'no'} · Privacy:{' '}
              {consents.privacy_accepted ? 'yes' : 'no'} · Essential cookies:{' '}
              {consents.cookies_essential_accepted ? 'yes' : 'no'} · Age:{' '}
              {consents.age_confirmed ? 'yes' : 'no'}
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800">
            <div className="flex gap-3">
              <Moon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <Label className="font-semibold text-slate-800 dark:text-slate-100">
                  Religious practice data (Article 9)
                </Label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  [LEGAL REVIEW NEEDED] When off, AI features that would send prayer/Islamic practice
                  data to our AI provider are blocked. Prayer times that use public APIs without
                  sending your logs to AI may still function.
                </p>
              </div>
            </div>
            <Switch
              checked={consents.art9_religious_accepted === true}
              disabled={saving}
              onCheckedChange={(checked) =>
                updateConsent({ art9_religious_accepted: Boolean(checked) })
              }
            />
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800">
            <div className="flex gap-3">
              <Heart className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <Label className="font-semibold text-slate-800 dark:text-slate-100">
                  Health / wellness data (Article 9)
                </Label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  [LEGAL REVIEW NEEDED] When off, AI features that would send mood/sleep/period or
                  similar health logs to our AI provider are blocked.
                </p>
              </div>
            </div>
            <Switch
              checked={consents.art9_health_accepted === true}
              disabled={saving}
              onCheckedChange={(checked) =>
                updateConsent({ art9_health_accepted: Boolean(checked) })
              }
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Withdrawing consent does not automatically erase historical data already stored.
              Use Data Protection / Delete Account for erasure. Full legal wording pending review.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={exportData}>
              <Download className="w-4 h-4" />
              Download my data (JSON)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                window.location.href = createPageUrl('DataProtection');
              }}
            >
              Open Data Protection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
