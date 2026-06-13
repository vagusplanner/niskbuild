"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import ReferralCard from '@/app/components/ReferralCard';
import PhoneVerification from '@/app/components/PhoneVerification';
import ActiveSessionsPanel from '@/app/components/ActiveSessionsPanel';
import ReloadPacks from '@/app/components/ReloadPacks';
import ThemeToggle from '@/app/components/ThemeToggle';
import { LocalOllamaLockedCard } from '@/app/components/BuilderOllamaSettings';
import { DEMOGRAPHIC_OPTIONS, type DemographicTier } from '@/lib/demographic-tiers';
import {
  ANALYTICS_REGIONS,
  detectBrowserRegion,
  normalizeAnalyticsRegion,
  type AnalyticsRegion,
} from '@/lib/user-region';
import { hasPaidTier } from '@/lib/access';
import { canUseLocalOllama } from '@/lib/tier-config';
import {
  passwordStrengthColor,
  passwordStrengthLabel,
  scorePassword,
  validatePassword,
} from '@/lib/password-strength';
import { planBadgeClass, planDisplayName } from '@/lib/plan-display';

type TabId = 'profile' | 'billing' | 'security' | 'danger';

type Toast = { message: string; type: 'success' | 'error' } | null;

type BillingSummary = {
  tier: string;
  tierLabel: string;
  status: string;
  creditsRemaining: number;
  creditsAllowance: number;
  creditsPercent: number;
  nextBillingDate: string | null;
  daysUntilReset: number | null;
  isCancelled: boolean;
  cancelAt: string | null;
  reloadCreditsExpiresAt: string | null;
};

type PaymentRow = {
  id: string;
  date: string | null;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  invoiceUrl: string | null;
};

const TIMEZONES = [
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
];

function creditBarColor(percent: number): string {
  if (percent > 50) return 'bg-[var(--success)]';
  if (percent > 20) return 'bg-amber-400';
  return 'bg-[var(--error)]';
}

export default function SettingsWorkspace() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'profile';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [timezone, setTimezone] = useState('Europe/London');
  const [language, setLanguage] = useState('en');
  const [metadataOptIn, setMetadataOptIn] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [projectCount, setProjectCount] = useState(0);

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [emailConfirmText, setEmailConfirmText] = useState('');
  const [deletingProjects, setDeletingProjects] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const [demographicTier, setDemographicTier] = useState<DemographicTier>('unspecified');
  const [telemetryOptOut, setTelemetryOptOut] = useState(false);
  const [analyticsRegion, setAnalyticsRegion] = useState<AnalyticsRegion>('Other');
  const [detectedRegion, setDetectedRegion] = useState<AnalyticsRegion>('Other');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [byocAllowed, setByocAllowed] = useState(false);
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiPreview, setOpenaiPreview] = useState('');
  const [anthropicPreview, setAnthropicPreview] = useState('');
  const [keysSaving, setKeysSaving] = useState(false);

  const supabase = createClient();
  const pwdScore = scorePassword(newPassword);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);

      const [profRes, billRes, histRes, privacyRes, keysRes, countRes] = await Promise.all([
        fetch('/api/settings/profile', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/billing/summary', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/billing/history', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/settings/privacy', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/settings/api-keys', { credentials: 'include' }).then((r) => r.json()),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
      ]);

      const p = profRes.profile || {};
      setFullName(p.full_name || '');
      setAvatarUrl(p.avatar_url || '');
      setTimezone(p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London');
      setLanguage(p.language || 'en');
      setMetadataOptIn(p.metadata_opt_in !== false);
      setPhoneVerified(p.phone_verified ?? true);
      setBilling(billRes);
      setPayments(histRes.payments || []);
      setDemographicTier(privacyRes.demographicTier || 'unspecified');
      setTelemetryOptOut(privacyRes.telemetryOptOut ?? false);
      const detected = detectBrowserRegion();
      setDetectedRegion(detected);
      setAnalyticsRegion(
        privacyRes.analyticsRegion && privacyRes.analyticsRegion !== 'Other'
          ? normalizeAnalyticsRegion(privacyRes.analyticsRegion)
          : detected
      );
      setByocAllowed(keysRes.byocAllowed ?? false);
      setUseOwnKeys(keysRes.useOwnKeys ?? false);
      setOpenaiPreview(keysRes.openaiPreview || '');
      setAnthropicPreview(keysRes.anthropicPreview || '');
      setProjectCount(countRes.count ?? 0);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const form = new FormData();
      form.append('fullName', fullName);
      form.append('timezone', timezone);
      form.append('language', language);
      form.append('metadataOptIn', String(metadataOptIn));
      if (avatarFile) form.append('avatar', avatarFile);

      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      setAvatarFile(null);
      showToast('Profile saved successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/settings?tab=billing` }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Portal unavailable');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open portal', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    const err = validatePassword(newPassword);
    if (err) {
      showToast(err, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) showToast(error.message, 'error');
    else {
      showToast('Password changed successfully', 'success');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const exportUserData = async () => {
    setExportingData(true);
    try {
      const res = await fetch('/api/export/user-data', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niskbuild-data-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data export downloaded', 'success');
    } catch {
      showToast('Failed to export data', 'error');
    } finally {
      setExportingData(false);
    }
  };

  const deleteAllProjects = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Type DELETE to confirm', 'error');
      return;
    }
    setDeletingProjects(true);
    try {
      const res = await fetch('/api/account/delete-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setProjectCount(0);
      setDeleteConfirmText('');
      showToast('All projects deleted', 'success');
    } catch {
      showToast('Failed to delete projects', 'error');
    } finally {
      setDeletingProjects(false);
    }
  };

  const deleteAccount = async () => {
    if (emailConfirmText !== user?.email) {
      showToast('Email address does not match', 'error');
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await signOut();
      window.location.href = '/landing';
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
      setDeletingAccount(false);
    }
  };

  const tier = billing?.tier || 'free';
  const isPaid = hasPaidTier(tier) && billing?.status === 'active';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto ${language === 'ar' ? 'rtl' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${
            toast.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <NiskBuildLogo variant="lockup" size="md" />
          <h1 className="text-3xl font-bold text-white mt-4">Settings</h1>
          <p className="text-nisk-muted text-sm mt-1">
            Manage your account, billing, and security.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-[var(--accent-cyan)] hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="w-full md:w-52 shrink-0 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 ${
                activeTab === t.id
                  ? t.id === 'danger'
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30'
                  : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)] border border-transparent'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'profile' && (
            <>
              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-white">{fullName || 'Your profile'}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${planBadgeClass(tier)}`}>
                        {planDisplayName(tier)}
                      </span>
                    </div>
                    <p className="text-sm text-nisk-muted">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">Avatar</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="text-sm text-nisk-muted"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">Email</label>
                    <input value={user?.email || ''} disabled className="w-full bg-nisk/50 border border-nisk rounded-lg px-3 py-2 text-nisk-muted text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">Timezone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm">
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm">
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                  {user?.id && (
                    <div>
                      <p className="text-xs text-nisk-muted uppercase tracking-wider mb-1">Usage</p>
                      <ProjectLimitBadge userId={user.id} currentCount={projectCount} />
                    </div>
                  )}
                  <button type="button" onClick={saveProfile} disabled={profileSaving} className="btn-primary px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </section>

              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Appearance</h2>
                <ThemeToggle />
              </section>

              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Privacy &amp; Analytics</h2>
                <p className="text-sm text-nisk-muted mb-4">Anonymous macro trends only — never your name, email, or raw prompts.</p>
                <select value={analyticsRegion} onChange={(e) => setAnalyticsRegion(e.target.value as AnalyticsRegion)} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-3">
                  {ANALYTICS_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-[11px] text-nisk-muted mb-3">Detected: {detectedRegion}</p>
                <select value={demographicTier} onChange={(e) => setDemographicTier(e.target.value as DemographicTier)} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-3">
                  <option value="unspecified">Prefer not to say</option>
                  {DEMOGRAPHIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={async () => {
                  setPrivacySaving(true);
                  try {
                    const res = await fetch('/api/settings/privacy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demographicTier, telemetryOptOut, analyticsRegion }) });
                    if (!res.ok) throw new Error();
                    showToast('Privacy settings saved', 'success');
                  } catch { showToast('Failed to save privacy', 'error'); }
                  finally { setPrivacySaving(false); }
                }} disabled={privacySaving} className="btn-secondary px-4 py-2 rounded-lg text-sm">
                  {privacySaving ? 'Saving…' : 'Save Privacy'}
                </button>
              </section>

              {billing && !canUseLocalOllama(billing.tier) && <LocalOllamaLockedCard tier={billing.tier} />}
              {byocAllowed && (
                <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-2">API Keys (BYOC)</h2>
                  <label className="flex items-center gap-2 mb-3 text-sm text-gray-300">
                    <input type="checkbox" checked={useOwnKeys} onChange={(e) => setUseOwnKeys(e.target.checked)} />
                    Use my own API keys
                  </label>
                  <input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder={`OpenAI ${openaiPreview ? `(${openaiPreview})` : ''}`} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-2" />
                  <input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder={`Anthropic ${anthropicPreview ? `(${anthropicPreview})` : ''}`} className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-3" />
                  <button type="button" onClick={async () => {
                    setKeysSaving(true);
                    try {
                      const res = await fetch('/api/settings/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useOwnKeys, openaiApiKey: openaiKey || undefined, anthropicApiKey: anthropicKey || undefined }) });
                      if (!res.ok) throw new Error();
                      showToast('API keys saved', 'success');
                    } catch { showToast('Save failed', 'error'); }
                    finally { setKeysSaving(false); }
                  }} disabled={keysSaving} className="btn-secondary px-4 py-2 rounded-lg text-sm">Save API Keys</button>
                </section>
              )}
              <ReferralCard />
            </>
          )}

          {activeTab === 'billing' && billing && (
            <>
              {searchParams.get('reload') === 'success' && (
                <p className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                  Reload pack purchased — credits added.
                </p>
              )}
              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-white">{billing.tierLabel}</p>
                    <p className="text-sm text-nisk-muted capitalize">Status: {billing.status}</p>
                    {billing.isCancelled && billing.cancelAt && (
                      <p className="text-sm text-amber-400 mt-1">
                        Cancelled — access until {new Date(billing.cancelAt).toLocaleDateString()}
                      </p>
                    )}
                    {billing.nextBillingDate && !billing.isCancelled && (
                      <p className="text-sm text-nisk-muted mt-1">
                        Next billing: {new Date(billing.nextBillingDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {(tier === 'free' || tier === 'pro') && (
                    <Link href="/pricing" className="btn-primary px-4 py-2 rounded-lg text-sm">Upgrade Plan</Link>
                  )}
                </div>
                {billing.creditsAllowance > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-nisk-muted">Credits remaining</span>
                      <span className="text-white">{billing.creditsRemaining} / {billing.creditsAllowance}</span>
                    </div>
                    <div className="w-full bg-nisk rounded-full h-2">
                      <div className={`h-2 rounded-full ${creditBarColor(billing.creditsPercent)}`} style={{ width: `${Math.min(100, billing.creditsPercent)}%` }} />
                    </div>
                    {billing.daysUntilReset != null && (
                      <p className="text-xs text-nisk-muted mt-2">Resets in {billing.daysUntilReset} day{billing.daysUntilReset !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                )}
                {billing.reloadCreditsExpiresAt && (
                  <p className="text-xs text-amber-400/90 mt-3">
                    Reload credits expire: {new Date(billing.reloadCreditsExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </section>

              {isPaid && <ReloadPacks />}

              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Billing History</h2>
                {payments.length === 0 ? (
                  <p className="text-sm text-nisk-muted">No payments yet. Your billing history will appear here after your first payment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-nisk-muted text-left border-b border-nisk">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2 pr-3">Plan</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="border-b border-nisk/50">
                            <td className="py-2 pr-3 text-gray-300">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</td>
                            <td className="py-2 pr-3 text-white">{p.currency} {p.amount.toFixed(2)}</td>
                            <td className="py-2 pr-3 text-nisk-muted truncate max-w-[140px]">{p.plan}</td>
                            <td className="py-2 pr-3 capitalize text-nisk-muted">{p.status}</td>
                            <td className="py-2">
                              {p.invoiceUrl ? (
                                <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline text-xs">Download</a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Manage Subscription</h2>
                {tier !== 'free' ? (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={openBillingPortal} disabled={portalLoading} className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                      {portalLoading ? 'Opening…' : 'Manage Subscription'}
                    </button>
                    <button type="button" onClick={() => setShowCancelModal(true)} className="text-sm text-red-400 hover:text-red-300">
                      Cancel Subscription
                    </button>
                  </div>
                ) : (
                  <Link href="/pricing" className="text-[var(--accent-cyan)] hover:underline text-sm">View plans →</Link>
                )}
              </section>
            </>
          )}

          {activeTab === 'security' && (
            <>
              {!phoneVerified && !isPaid && <PhoneVerification onVerified={() => setPhoneVerified(true)} />}
              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
                <div className="space-y-3">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8, 1 number, 1 uppercase)" className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm" />
                  {newPassword && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-nisk rounded-full overflow-hidden">
                        <div className={`h-full ${passwordStrengthColor(pwdScore)}`} style={{ width: `${(pwdScore / 4) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-nisk-muted">{passwordStrengthLabel(pwdScore)}</span>
                    </div>
                  )}
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm" />
                  <button type="button" onClick={handlePasswordChange} disabled={passwordLoading} className="btn-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                    {passwordLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </section>
              <ActiveSessionsPanel />
              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-nisk-muted mb-3">Coming soon — extra security for your account.</p>
                <button type="button" onClick={() => showToast("We'll notify you when 2FA is available.", 'success')} className="btn-secondary px-3 py-1.5 rounded-lg text-xs">Notify Me</button>
              </section>
              <section className="bg-nisk-card border border-nisk rounded-xl p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={metadataOptIn} onChange={(e) => setMetadataOptIn(e.target.checked)} className="rounded border-nisk" />
                  <span className="text-sm text-gray-300">Help improve NiskBuild anonymously</span>
                </label>
                <button type="button" onClick={saveProfile} className="mt-3 btn-secondary px-4 py-2 rounded-lg text-sm">Save preference</button>
              </section>
            </>
          )}

          {activeTab === 'danger' && (
            <section className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-red-400 mb-2">Export All My Data</h2>
                <p className="text-sm text-nisk-muted mb-3">ZIP with project blueprints, prompts, and SEO — not generated code files.</p>
                <button type="button" onClick={exportUserData} disabled={exportingData} className="btn-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  {exportingData ? 'Exporting…' : 'Export All My Data'}
                </button>
              </div>
              <div className="border-t border-red-900/50 pt-6">
                <h3 className="text-white font-medium mb-2">Delete All Projects</h3>
                <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder='Type "DELETE" to confirm' className="w-full md:w-64 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-3" />
                <button type="button" onClick={deleteAllProjects} disabled={deletingProjects} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm disabled:opacity-50">
                  {deletingProjects ? 'Deleting…' : 'Delete All Projects'}
                </button>
              </div>
              <div className="border-t border-red-900/50 pt-6">
                <h3 className="text-white font-medium mb-2">Delete Account</h3>
                <input type="email" value={emailConfirmText} onChange={(e) => setEmailConfirmText(e.target.value)} placeholder={`Type "${user?.email}" to confirm`} className="w-full md:w-64 bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-3" />
                <button type="button" onClick={deleteAccount} disabled={deletingAccount} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm disabled:opacity-50">
                  {deletingAccount ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-nisk-card border border-nisk rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Cancel subscription?</h3>
            <p className="text-sm text-nisk-muted mb-3">You will lose access to:</p>
            <ul className="text-sm text-gray-300 list-disc pl-5 mb-4 space-y-1">
              <li>Cloud AI credits and generation</li>
              <li>Clean ZIP export and live preview links</li>
              <li>Pro+ features (SEO save, Stripe inject, visual edit)</li>
            </ul>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCancelModal(false)} className="flex-1 btn-primary py-2 rounded-lg text-sm">Keep My Plan</button>
              <button type="button" onClick={() => { setShowCancelModal(false); openBillingPortal(); }} className="flex-1 btn-secondary py-2 rounded-lg text-sm text-red-400 border-red-500/40">Cancel Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
