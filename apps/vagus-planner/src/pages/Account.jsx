import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExternalCalendarManager from '@/components/integrations/ExternalCalendarManager';
import { motion } from 'framer-motion';
import {
  User,
  CreditCard,
  Trash2,
  ArrowLeft,
  Calendar,
  Heart,
  Moon,
  Sparkles,
  Shield,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PullToRefresh from '@/components/mobile/PullToRefresh';

import AccountSettings from '@/components/profile/AccountSettings';
import AccountSecurityPanel from '@/components/profile/AccountSecurityPanel';
import AccountThemePreference from '@/components/profile/AccountThemePreference';
import AccountLanguagePreference from '@/components/profile/AccountLanguagePreference';
import ProfilePictureUploader from '@/components/profile/ProfilePictureUploader';
import EnhancedSubscriptionCard from '@/components/billing/EnhancedSubscriptionCard';
import BillingHistory from '@/components/billing/BillingHistory';
import UsageTracker from '@/components/billing/UsageTracker';
import EmailNotificationSettings from '@/components/billing/EmailNotificationSettings';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';
import JournalReminderSettings from '@/components/settings/JournalReminderSettings';
import PersonalPreferencesPanel from '@/components/profile/PersonalPreferencesPanel';
import AccountDeletionDialog from '@/components/profile/AccountDeletionDialog';
import ConsentPreferencesPanel from '@/components/legal/ConsentPreferencesPanel';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';
import { useBillingStatus } from '@/hooks/useBillingStatus';

const DEFAULT_SETTINGS = {
  theme: 'light',
  notifications: true,
  edition: 'standard',
  islamic_mode: false,
  prayer_enabled: true,
  week_starts_on: 'monday',
};

function resolveEdition(record) {
  if (!record) return 'standard';
  if (record.edition === 'islamic' || record.edition === 'standard') return record.edition;
  const prefs = record.preferences;
  if (
    prefs &&
    typeof prefs === 'object' &&
    (prefs.edition === 'islamic' || prefs.edition === 'standard')
  ) {
    return prefs.edition;
  }
  if (record.islamic_mode === true) return 'islamic';
  return 'standard';
}

function SettingsSectionLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-[#1D6FB8] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const SECTIONS = [
  {
    id: 'personal',
    icon: User,
    label: 'Personal Info',
    sub: 'Name, photo & email',
    gradient: 'from-[#1D6FB8] to-[#29ABE2]',
  },
  {
    id: 'security',
    icon: Lock,
    label: 'Security',
    sub: 'Password, 2FA & sign-out',
    gradient: 'from-[#2D4A65] to-[#4A6E8A]',
  },
  {
    id: 'preferences',
    icon: SlidersHorizontal,
    label: 'Preferences',
    sub: 'Edition, alerts, theme & more',
    gradient: 'from-[#0D4F6C] to-[#2980B9]',
  },
  {
    id: 'billing',
    icon: CreditCard,
    label: 'Subscription & Billing',
    sub: 'Plan, payment & invoices',
    gradient: 'from-[#4A55A2] to-[#1D6FB8]',
  },
  {
    id: 'privacy',
    icon: Shield,
    label: 'Privacy & Data',
    sub: 'Consent, export & deletion',
    gradient: 'from-teal-600 to-cyan-700',
  },
];

const HASH_ALIASES = {
  personal: 'personal',
  profile: 'personal',
  security: 'security',
  preferences: 'preferences',
  settings: 'preferences',
  notifications: 'preferences',
  billing: 'billing',
  privacy: 'privacy',
  delete: 'privacy',
  danger: 'privacy',
};

function sectionFromHash() {
  if (typeof window === 'undefined') return null;
  const raw = (window.location.hash || '').replace(/^#/, '').toLowerCase();
  if (!raw) return null;
  return HASH_ALIASES[raw] || null;
}

export default function Account() {
  const [activeSection, setActiveSection] = useState(() => sectionFromHash());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const applyHash = () => {
      const section = sectionFromHash();
      if (section) setActiveSection(section);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const openSection = (id) => {
    setActiveSection(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const closeSection = () => {
    setActiveSection(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list ?? [];
    },
    staleTime: 30000,
  });

  const settingsRecord = settingsData && settingsData.length > 0 ? settingsData[0] : null;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savingEdition, setSavingEdition] = useState(false);
  const { hasPaidIslamicAccess, isLoading: islamicAccessLoading } = useIslamicEdition();

  useEffect(() => {
    if (settingsRecord) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsRecord });
    }
  }, [settingsRecord]);

  const preferredEdition = resolveEdition(settingsRecord ?? settings);
  const currentEdition =
    hasPaidIslamicAccess && preferredEdition === 'islamic' ? 'islamic' : 'standard';

  const saveEdition = async (edition) => {
    setSavingEdition(true);
    try {
      if (!user?.id) {
        throw new Error('Not signed in');
      }

      const islamicMode = edition === 'islamic';
      const existingPrefs =
        settingsRecord?.preferences && typeof settingsRecord.preferences === 'object'
          ? settingsRecord.preferences
          : {};
      const payload = {
        edition,
        islamic_mode: islamicMode,
        preferences: { ...existingPrefs, edition },
      };

      if (settingsRecord?.id) {
        await base44.entities.UserSettings.update(settingsRecord.id, payload);
      } else {
        await base44.entities.UserSettings.create(payload);
      }

      setSettings((prev) => ({ ...prev, edition, islamic_mode: islamicMode }));
      return true;
    } catch (err) {
      console.error('Failed to save edition:', err);
      toast.error('Failed to save edition preference');
      return false;
    } finally {
      setSavingEdition(false);
    }
  };

  const handleEditionToggle = async (checked) => {
    const edition = checked ? 'islamic' : 'standard';
    if (edition === 'islamic' && !hasPaidIslamicAccess) {
      toast.error('Islamic Edition requires an active Islamic plan. Upgrade in Billing.');
      window.location.href = '/Billing';
      return;
    }
    const saved = await saveEdition(edition);
    if (!saved) return;

    try {
      localStorage.setItem('vagus_edition', edition);
      localStorage.setItem('vagus_islamic_mode', edition === 'islamic' ? '1' : '0');
    } catch {
      // ignore
    }
    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    queryClient.invalidateQueries({ queryKey: ['islamicAccess'] });
    toast.success(
      edition === 'islamic'
        ? 'Islamic Edition enabled! Reloading…'
        : 'Standard Edition enabled! Reloading…'
    );
    setTimeout(() => window.location.reload(), 800);
  };

  const {
    subscription,
    invoices = [],
    refetch: refetchBilling,
    platformOwnerBypass = false,
  } = useBillingStatus();

  const { data: usageData = [] } = useQuery({
    queryKey: ['usage', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const list = await base44.entities.Usage.filter({ user_email: user.email });
        return list ?? [];
      } catch (error) {
        console.error('Error fetching usage:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile updated!');
    },
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
      queryClient.invalidateQueries({ queryKey: ['userSettings'] }),
      queryClient.invalidateQueries({ queryKey: ['billingStatus'] }),
      queryClient.invalidateQueries({ queryKey: ['planAccess'] }),
      refetchBilling(),
      refetchSettings(),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen pb-safe">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 lg:py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#0D4F6C] to-[#1D6FB8] p-5 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-[#A8C8E8]" />
                  <span className="text-xs font-bold text-[#A8C8E8] uppercase tracking-widest">
                    Account
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">Account Settings</h1>
                <p className="text-sm text-[#A8C8E8] mt-1">
                  Personal info, security, preferences, billing &amp; privacy — each in one place
                </p>
              </div>
            </div>
          </motion.div>

          {!activeSection ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {SECTIONS.map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -3 }}
                  onClick={() => openSection(s.id)}
                  className={`group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${s.gradient} shadow-md hover:shadow-xl transition-all`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="p-2 bg-white/20 rounded-lg w-fit">
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{s.label}</p>
                      <p className="text-xs text-white/70 mt-0.5">{s.sub}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
              <p className="sm:col-span-2 lg:col-span-3 text-center pt-1">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open_help_center'))}
                  className="text-sm font-medium text-[#1D6FB8] hover:underline"
                >
                  Tips &amp; Help
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <button
                onClick={closeSection}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#1D6FB8] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {/* 1. PERSONAL INFO — one photo + name/email */}
              {activeSection === 'personal' && (
                <div className="space-y-4">
                  <Card className="border-0 shadow-sm p-4">
                    <ProfilePictureUploader user={user} />
                  </Card>
                  <AccountSettings
                    user={user}
                    onUpdate={(data) => updateProfileMutation.mutate(data)}
                    isSaving={updateProfileMutation.isPending}
                  />
                </div>
              )}

              {/* 2. SECURITY */}
              {activeSection === 'security' && <AccountSecurityPanel />}

              {/* 3. PREFERENCES */}
              {activeSection === 'preferences' &&
                (settingsLoading ? (
                  <SettingsSectionLoader />
                ) : (
                  <div className="space-y-4">
                    <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center shadow-md">
                            <Moon className="w-4 h-4 text-white" />
                          </div>
                          Edition
                        </CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Switch between Standard and Islamic editions. Islamic mode shows prayer
                          tools, the Islam tab, and Islamic-themed navigation.
                        </p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                currentEdition === 'islamic'
                                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
                                  : 'bg-gradient-to-br from-teal-500 to-cyan-500'
                              }`}
                            >
                              {currentEdition === 'islamic' ? (
                                <Moon className="w-5 h-5 text-white" />
                              ) : (
                                <Calendar className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Label
                                htmlFor="islamic-edition-toggle"
                                className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                              >
                                {currentEdition === 'islamic'
                                  ? 'Islamic Edition'
                                  : 'Standard Edition'}
                              </Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {currentEdition === 'islamic'
                                  ? 'Prayer times, Quran, Hajj & Islamic calendar features'
                                  : hasPaidIslamicAccess
                                    ? 'Calendar, health, travel & productivity focus'
                                    : 'Islamic Edition features require an active Islamic plan'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {savingEdition && (
                              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                            )}
                            <Switch
                              id="islamic-edition-toggle"
                              checked={currentEdition === 'islamic'}
                              onCheckedChange={handleEditionToggle}
                              disabled={savingEdition || islamicAccessLoading || !user?.id}
                              className="data-[state=checked]:bg-indigo-600"
                            />
                          </div>
                        </div>
                        {!hasPaidIslamicAccess && !islamicAccessLoading && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                            Unlock Islamic Edition from Billing — the toggle alone cannot enable
                            paid features.
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {[
                            {
                              id: 'standard',
                              label: 'Standard',
                              icon: Calendar,
                              active: currentEdition === 'standard',
                            },
                            {
                              id: 'islamic',
                              label: 'Islamic',
                              icon: Moon,
                              active: currentEdition === 'islamic',
                            },
                          ].map((opt) => {
                            const Icon = opt.icon;
                            const islamicLocked = opt.id === 'islamic' && !hasPaidIslamicAccess;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={savingEdition || islamicAccessLoading || !user?.id}
                                onClick={() => {
                                  if (currentEdition !== opt.id) {
                                    handleEditionToggle(opt.id === 'islamic');
                                  }
                                }}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${
                                  opt.active
                                    ? opt.id === 'islamic'
                                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                                      : 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'
                                    : islamicLocked
                                      ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="font-medium">
                                  {opt.label}
                                  {islamicLocked ? ' (upgrade)' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <AccountThemePreference />
                    <AccountLanguagePreference />

                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" /> Notifications
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Push, in-app, journal reminders, and billing email alerts — all in one place.
                      </p>
                      <div className="space-y-4">
                        <NotificationPreferencesPanel settingsData={settingsData} />
                        <JournalReminderSettings settingsData={settingsData} />
                        {!platformOwnerBypass && <EmailNotificationSettings />}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Lifestyle &amp; calendar
                      </h3>
                      <PersonalPreferencesPanel settingsData={settingsData} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Calendar Integrations
                      </h3>
                      <ExternalCalendarManager />
                    </div>
                  </div>
                ))}

              {/* 4. SUBSCRIPTION & BILLING — plan/payment/invoices only */}
              {activeSection === 'billing' && (
                <div className="space-y-4">
                  <EnhancedSubscriptionCard
                    subscription={subscription || { plan: 'free', status: 'active' }}
                    usageData={usageData}
                    platformOwnerBypass={platformOwnerBypass}
                    onManage={async () => {
                      try {
                        const { data } = await base44.functions.invoke(
                          'createCustomerPortalSession'
                        );
                        if (data?.portalUrl) window.location.href = data.portalUrl;
                        else toast.error(data?.error || 'Failed');
                      } catch {
                        toast.error('Failed');
                      }
                    }}
                    onUpgrade={() => (window.location.href = '/Billing')}
                    onCancel={async () => {
                      try {
                        await base44.functions.invoke('cancelStripeSubscription', {
                          subscriptionId: subscription?.stripe_subscription_id || '',
                          reason: 'User requested',
                        });
                        queryClient.invalidateQueries({ queryKey: ['billingStatus'] });
                        queryClient.invalidateQueries({ queryKey: ['planAccess'] });
                        toast.success('Cancelled');
                      } catch {
                        toast.error('Failed to cancel');
                      }
                    }}
                  />
                  <UsageTracker usageData={usageData} plan={subscription?.plan || 'free'} />
                  {!platformOwnerBypass && <BillingHistory invoices={invoices} />}
                </div>
              )}

              {/* 5. PRIVACY & DATA — consents, export, single delete */}
              {activeSection === 'privacy' && (
                <div className="space-y-4">
                  <ConsentPreferencesPanel userEmail={user?.email} />
                  <Card className="border-red-200 dark:border-red-900">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
                        <Trash2 className="w-5 h-5" /> Delete Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 leading-relaxed">
                        <strong>This action is permanent and cannot be undone.</strong> All your
                        data — events, tasks, goals, journal entries, prayer logs, and billing
                        history — will be deleted immediately.
                      </div>
                      <Button
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full min-h-[48px] bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Permanently Delete My Account
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <AccountDeletionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        userEmail={user?.email}
      />
    </PullToRefresh>
  );
}
