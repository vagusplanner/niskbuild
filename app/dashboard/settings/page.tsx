"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import ReferralCard from '@/app/components/ReferralCard';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import { DEMOGRAPHIC_OPTIONS, type DemographicTier } from '@/lib/demographic-tiers';
import PhoneVerification from '@/app/components/PhoneVerification';
import ActiveSessionsPanel from '@/app/components/ActiveSessionsPanel';
import { hasPaidTier } from '@/lib/access';
import ReloadPacks from '@/app/components/ReloadPacks';
import {
  LocalOllamaLockedCard,
} from '@/app/components/BuilderOllamaSettings';
import { canUseLocalOllama } from '@/lib/tier-config';
import { useSearchParams } from 'next/navigation';

interface Profile {
  subscription_tier: string;
  subscription_status: string;
  cloud_credits_remaining?: number;
}

function DashboardSettingsContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [portalLoading, setPortalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiPreview, setOpenaiPreview] = useState('');
  const [anthropicPreview, setAnthropicPreview] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [demographicTier, setDemographicTier] = useState<DemographicTier>('unspecified');
  const [telemetryOptOut, setTelemetryOptOut] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [byocAllowed, setByocAllowed] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get('tab') ||
    (searchParams.get('verify_phone') === '1' ? 'security' : 'account');
  const [activeTab, setActiveTab] = useState<
    'account' | 'security' | 'billing' | 'integrations'
  >(initialTab as 'account' | 'security' | 'billing' | 'integrations');

  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const [{ data: prof }, { count }, keysRes, privacyRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, cloud_credits_remaining, phone_verified')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
        fetch('/api/settings/api-keys').then((r) => r.json()),
        fetch('/api/settings/privacy').then((r) => r.json()),
      ]);

      setProfile(prof);
      setProjectCount(count ?? 0);
      setUseOwnKeys(keysRes.useOwnKeys ?? false);
      setByocAllowed(keysRes.byocAllowed ?? false);
      setOpenaiPreview(keysRes.openaiPreview || '');
      setAnthropicPreview(keysRes.anthropicPreview || '');
      setPhoneVerified(prof?.phone_verified ?? false);
      setDemographicTier(privacyRes.demographicTier || 'unspecified');
      setTelemetryOptOut(privacyRes.telemetryOptOut ?? false);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/settings` }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Portal unavailable');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✅ Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const saveApiKeys = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useOwnKeys,
          openaiApiKey: openaiKey || undefined,
          anthropicApiKey: anthropicKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage('✅ API key settings saved');
      setOpenaiKey('');
      setAnthropicKey('');
      const refreshed = await fetch('/api/settings/api-keys').then((r) => r.json());
      setOpenaiPreview(refreshed.openaiPreview || '');
      setAnthropicPreview(refreshed.anthropicPreview || '');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        '⚠️ This permanently deletes all your projects and profile data. This cannot be undone. Continue?'
      )
    ) {
      return;
    }

    setDeleting(true);
    setMessage('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await signOut();
      window.location.href = '/landing';
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  const tier = profile?.subscription_tier || 'free';
  const tierLabel = tier === 'white_label' ? 'White-Label' : tier.charAt(0).toUpperCase() + tier.slice(1);
  const isPaid =
    hasPaidTier(profile?.subscription_tier) &&
    profile?.subscription_status === 'active';

  const tabs = [
    { id: 'account' as const, label: 'Account' },
    { id: 'security' as const, label: 'Security' },
    { id: 'billing' as const, label: 'Billing' },
    { id: 'integrations' as const, label: 'Integrations' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <NiskBuildLogo variant="lockup" size="md" />
            <h1 className="text-2xl font-bold text-white mt-4">Settings & Billing</h1>
            <p className="text-nisk-muted text-sm mt-1">
              Profile, security, subscription, and API preferences.
            </p>
          </div>
          <Link href="/builder" className="text-sm text-[var(--accent-cyan)] hover:underline">
            ← Back to Builder
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-3 rounded-lg bg-nisk-surface border border-nisk text-sm text-gray-300">
            {message}
          </div>
        )}

        <nav className="flex gap-1 mb-6 border-b border-nisk pb-px overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === t.id
                  ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'border-transparent text-nisk-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === 'account' && (
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-nisk-muted text-xs uppercase tracking-wider mb-1">Email</p>
              <p className="text-white">{user?.email}</p>
            </div>
            {user?.created_at && (
              <div>
                <p className="text-nisk-muted text-xs uppercase tracking-wider mb-1">Member since</p>
                <p className="text-white">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {user?.id && (
              <div>
                <p className="text-nisk-muted text-xs uppercase tracking-wider mb-1">Usage</p>
                <ProjectLimitBadge userId={user.id} currentCount={projectCount} />
              </div>
            )}
          </div>
        </section>
        )}

        {activeTab === 'billing' && (
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-white font-medium">{tierLabel} plan</p>
              <p className="text-sm text-nisk-muted capitalize">
                Status: {profile?.subscription_status || 'active'}
              </p>
              {tier !== 'free' && (
                <p className="text-sm text-[var(--accent-cyan)] mt-1">
                  Cloud credits: {profile?.cloud_credits_remaining ?? 0} remaining
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tier === 'free' ? (
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg bg-gradient-brand text-white text-sm font-medium"
                >
                  Upgrade →
                </Link>
              ) : (
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-brand text-white text-sm font-medium disabled:opacity-50"
                >
                  {portalLoading ? 'Opening...' : 'Manage Billing'}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-nisk-muted mt-3">
            Cancel, update payment method, or download invoices via Stripe&apos;s secure portal.
          </p>
        </section>
        )}

        {activeTab === 'billing' && profile?.subscription_tier && profile.subscription_tier !== 'free' && (
          <div className="mb-6">
            <ReloadPacks />
          </div>
        )}

        {searchParams.get('reload') === 'success' && activeTab === 'billing' && (
          <p className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            Reload pack purchased — credits added to your account.
          </p>
        )}

        {activeTab === 'security' && (
        <>
        {!phoneVerified && !isPaid && (
          <PhoneVerification onVerified={() => setPhoneVerified(true)} />
        )}
        {phoneVerified && !isPaid && (
          <p className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            Phone verified for Sandbox access.
          </p>
        )}
        <ActiveSessionsPanel />
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Password</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>
            <div>
              <label className="text-xs text-nisk-muted uppercase tracking-wider block mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="px-4 py-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10 text-sm font-medium disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </section>
        </>
        )}

        {activeTab === 'account' && (
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Privacy &amp; Analytics</h2>
          <p className="text-sm text-nisk-muted mb-4">
            NiskBuild logs <strong className="text-gray-300">anonymous macro trends</strong> only —
            app category, tech stack, and age bracket. Never your name, email, IP, or raw prompts.
          </p>
          <label className="block text-xs text-nisk-muted uppercase tracking-wider mb-2">
            Age bracket (for anonymized market research)
          </label>
          <select
            value={demographicTier}
            onChange={(e) => setDemographicTier(e.target.value as DemographicTier)}
            className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="unspecified">Prefer not to say</option>
            {DEMOGRAPHIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={telemetryOptOut}
              onChange={(e) => setTelemetryOptOut(e.target.checked)}
              className="rounded border-nisk"
            />
            <span className="text-sm text-gray-300">Opt out of anonymous telemetry entirely</span>
          </label>
          <button
            type="button"
            onClick={async () => {
              setPrivacySaving(true);
              setMessage('');
              try {
                const res = await fetch('/api/settings/privacy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ demographicTier, telemetryOptOut }),
                });
                if (!res.ok) throw new Error('Save failed');
                setMessage('Privacy settings saved');
              } catch {
                setMessage('Failed to save privacy settings');
              } finally {
                setPrivacySaving(false);
              }
            }}
            disabled={privacySaving}
            className="px-5 py-2.5 rounded-lg border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 text-sm font-medium disabled:opacity-50"
          >
            {privacySaving ? 'Saving...' : 'Save Privacy Settings'}
          </button>
        </section>
        )}

        {activeTab === 'integrations' && (
        <>
        {/* Local Ollama — Agency+ only */}
        {profile && !canUseLocalOllama(profile.subscription_tier) ? (
          <LocalOllamaLockedCard tier={profile.subscription_tier} />
        ) : profile && canUseLocalOllama(profile.subscription_tier) ? (
          <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Local AI (Ollama)</h2>
            <p className="text-sm text-nisk-muted mb-3">
              Connect Ollama on your machine from the Builder sidebar under <strong className="text-white">Engine → Connect Local Ollama</strong>.
              Local builds do not consume cloud credits.
            </p>
            <Link href="/builder" className="text-[var(--accent-cyan)] hover:underline font-medium text-sm">
              Open Builder →
            </Link>
          </section>
        ) : null}

        {/* API Keys — Agency+ only */}
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Custom API Keys (BYOC)</h2>
          {!byocAllowed ? (
            <div className="text-sm text-nisk-muted">
              <p className="mb-3">
                Bring-your-own API keys are available on <strong className="text-white">Agency Studio ($199/mo)</strong> and above.
                This prevents Pro users from bypassing cloud credits after canceling.
              </p>
              <Link href="/pricing" className="text-[var(--accent-cyan)] hover:underline font-medium">
                Upgrade to Agency →
              </Link>
            </div>
          ) : (
            <>
          <p className="text-sm text-nisk-muted mb-4">
            Use your own OpenAI or Anthropic keys — does not consume NiskBuild credits.
          </p>
          <label className="flex items-center gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={useOwnKeys}
              onChange={(e) => setUseOwnKeys(e.target.checked)}
              className="rounded border-nisk"
            />
            <span className="text-sm text-gray-300">Use my own API keys</span>
          </label>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-nisk-muted uppercase tracking-wider mb-1">
                OpenAI {openaiPreview && <span className="normal-case">({openaiPreview})</span>}
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>
            <div>
              <label className="block text-xs text-nisk-muted uppercase tracking-wider mb-1">
                Anthropic {anthropicPreview && <span className="normal-case">({anthropicPreview})</span>}
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-nisk border border-nisk rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>
          </div>
          <button
            onClick={saveApiKeys}
            disabled={saving}
            className="mt-5 px-5 py-2.5 rounded-lg border border-[var(--secondary)] text-[var(--secondary)] hover:bg-[var(--secondary)]/10 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save API Keys'}
          </button>
            </>
          )}
        </section>

        {/* Referral */}
        <div className="mb-6">
          <ReferralCard />
        </div>

        {/* Local sync info */}
        <section className="bg-nisk-card border border-nisk rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Local Sync</h2>
          <p className="text-sm text-nisk-muted">
            ZIP exports include <code className="text-[var(--accent-cyan)]">niskbuild.config.json</code>.
            Drop a previous export onto the Builder canvas to restore prompt history.
          </p>
        </section>

        {/* Danger zone */}
        <section className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-nisk-muted mb-4">
            Permanently delete your projects, profile, and account. This cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </section>
        </>
        )}
      </div>
    </Layout>
  );
}

export default function DashboardSettingsPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      }
    >
      <DashboardSettingsContent />
    </Suspense>
  );
}
