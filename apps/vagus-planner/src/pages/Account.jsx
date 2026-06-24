import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { base44, supabase } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExternalCalendarManager from '@/components/integrations/ExternalCalendarManager';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, CreditCard, Trash2, ArrowLeft, Bell, Calendar, Brain, Heart, Moon, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import PullToRefresh from '@/components/mobile/PullToRefresh';

import AccountSettings from '@/components/profile/AccountSettings';
import ProfilePictureUploader from '@/components/profile/ProfilePictureUploader';
import EnhancedSubscriptionCard from '@/components/billing/EnhancedSubscriptionCard';
import BillingHistory from '@/components/billing/BillingHistory';
import UsageTracker from '@/components/billing/UsageTracker';
import EmailNotificationSettings from '@/components/billing/EmailNotificationSettings';
import NotificationPreferences from '@/components/profile/NotificationPreferences';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';
import JournalReminderSettings from '@/components/settings/JournalReminderSettings';
import PersonalPreferencesPanel from '@/components/profile/PersonalPreferencesPanel';
import AccountDeletionDialog from '@/components/profile/AccountDeletionDialog';

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
  if (prefs && typeof prefs === 'object' && (prefs.edition === 'islamic' || prefs.edition === 'standard')) {
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

export default function Account() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const list = await base44.entities.UserSettings.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching settings:', error);
        return [];
      }
    },
  });

  const settingsRecord = settingsData && settingsData.length > 0 ? settingsData[0] : null;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savingEdition, setSavingEdition] = useState(false);

  useEffect(() => {
    if (settingsRecord) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsRecord });
    }
  }, [settingsRecord]);

  const currentEdition = resolveEdition(settingsRecord ?? settings);

  const saveEdition = async (edition) => {
    setSavingEdition(true);
    try {
      if (!user?.id) {
        throw new Error('Not signed in');
      }

      // Direct update on the edition column
      const { data, error } = await supabase
        .schema('firstparty')
        .from('vp_user_settings')
        .update({ edition })
        .eq('user_id', user.id)
        .select('id');

      if (error) throw error;

      if (!data?.length) {
        const { error: insertError } = await supabase
          .schema('firstparty')
          .from('vp_user_settings')
          .insert({ user_id: user.id, edition });

        if (insertError) throw insertError;
      }

      setSettings((prev) => ({ ...prev, edition }));
      console.log('✅ Edition saved:', edition);
      return true;
    } catch (err) {
      console.error('❌ Failed to save edition:', err);
      toast.error('Failed to save edition preference');
      return false;
    } finally {
      setSavingEdition(false);
    }
  };

  const handleEditionToggle = async (checked) => {
    const edition = checked ? 'islamic' : 'standard';
    const saved = await saveEdition(edition);
    if (!saved) return;

    try {
      localStorage.setItem('vagus_edition', edition);
      localStorage.setItem('vagus_islamic_mode', edition === 'islamic' ? '1' : '0');
    } catch {
      // ignore
    }
    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    toast.success(
      edition === 'islamic'
        ? 'Islamic Edition enabled! Reloading…'
        : 'Standard Edition enabled! Reloading…'
    );
    setTimeout(() => window.location.reload(), 800);
  };

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        const list = await base44.entities.Subscription.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching subscription:', error);
        return [];
      }
    },
  });
  const subscription = subscriptions?.[0] ?? null;

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      try {
        const list = await base44.entities.Invoice.list();
        return list ?? [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
    },
  });

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
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settingsRecord?.id) {
        return base44.entities.UserSettings.update(settingsRecord.id, data);
      } else {
        return base44.entities.UserSettings.create(data);
      }
    },
    onSuccess: () => {
      refetchSettings();
      toast.success('Settings updated!');
    }
  });

  const handleToggleSetting = (key, value) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
      queryClient.invalidateQueries({ queryKey: ['userSettings'] }),
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    ]);
  };

  const SECTIONS = [
    { id: 'profile', icon: User, label: 'Profile', sub: 'Your account info', gradient: 'from-[#1D6FB8] to-[#29ABE2]', glow: 'shadow-blue-400/30' },
    { id: 'settings', icon: Settings, label: 'Settings', sub: 'Notifications & preferences', gradient: 'from-[#2D4A65] to-[#4A6E8A]', glow: 'shadow-slate-400/30' },
    { id: 'billing', icon: CreditCard, label: 'Billing', sub: 'Subscription & invoices', gradient: 'from-[#4A55A2] to-[#1D6FB8]', glow: 'shadow-indigo-400/30' },
    { id: 'preferences', icon: Heart, label: 'Preferences', sub: 'Dietary & theme', gradient: 'from-[#0D4F6C] to-[#2980B9]', glow: 'shadow-blue-400/30' },
    { id: 'danger', icon: Trash2, label: 'Delete Account', sub: 'Permanently remove data', gradient: 'from-red-600 to-red-700', glow: 'shadow-red-400/30' },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen pb-safe">
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 lg:py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#0D4F6C] to-[#1D6FB8] p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-[#A8C8E8]" />
                <span className="text-xs font-bold text-[#A8C8E8] uppercase tracking-widest">Account</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Account Settings</h1>
              <p className="text-sm text-[#A8C8E8] mt-1">Manage profile, notifications, billing & integrations</p>
            </div>
          </div>
        </motion.div>

        {/* Section Grid or Detail */}
        {!activeSection ? (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SECTIONS.map(s => (
              <motion.button
                key={s.id}
                whileHover={{ y: -3 }}
                onClick={() => setActiveSection(s.id)}
                className={`group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${s.gradient} shadow-md hover:shadow-xl transition-all`}
              >
                <div className="flex flex-col gap-2">
                  <div className="p-2 bg-white/20 rounded-lg w-fit"><s.icon className="w-5 h-5 text-white" /></div>
                  <div>
                    <p className="text-sm font-bold text-white">{s.label}</p>
                    <p className="text-xs text-white/70 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#1D6FB8] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {activeSection === 'profile' && (
              <div className="space-y-4">
                <ProfilePictureUploader user={user} />
                <AccountSettings user={user} onUpdate={(data) => updateProfileMutation.mutate(data)} isSaving={updateProfileMutation.isPending} />
              </div>
            )}

            {activeSection === 'settings' && (
              settingsLoading ? (
                <SettingsSectionLoader />
              ) : (
                <div className="space-y-4">
                  <Card className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 flex items-center justify-center shadow-md">
                          <Moon className="w-4 h-4 text-white" />
                        </div>
                        Islamic Edition
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Switch between Standard and Islamic editions. Islamic mode shows prayer tools, the Islam tab,
                        and Islamic-themed navigation.
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
                            <Label htmlFor="islamic-edition-toggle" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {currentEdition === 'islamic' ? 'Islamic Edition' : 'Standard Edition'}
                            </Label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {currentEdition === 'islamic'
                                ? 'Prayer times, Quran, Hajj & Islamic calendar features'
                                : 'Calendar, health, travel & productivity focus'}
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
                            disabled={savingEdition || !user?.id}
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {[
                          { id: 'standard', label: 'Standard', icon: Calendar, active: currentEdition === 'standard' },
                          { id: 'islamic', label: 'Islamic', icon: Moon, active: currentEdition === 'islamic' },
                        ].map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={savingEdition || !user?.id}
                              onClick={() => {
                                if (currentEdition !== opt.id) handleEditionToggle(opt.id === 'islamic');
                              }}
                              className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${
                                opt.active
                                  ? opt.id === 'islamic'
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                                    : 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  <NotificationPreferencesPanel settingsData={settingsData} />
                  <JournalReminderSettings settingsData={settingsData} />
                </div>
              )
            )}

            {activeSection === 'billing' && (
              <div className="space-y-4">
                <EnhancedSubscriptionCard subscription={subscription||{}} usageData={usageData}
                  onManage={async()=>{try{const{data}=await base44.functions.invoke('createCustomerPortalSession');if(data?.portalUrl)window.location.href=data.portalUrl;else toast.error(data?.error||'Failed')}catch{toast.error('Failed')}}}
                  onUpgrade={()=>window.location.href='/Billing'}
                  onCancel={async()=>{if(subscription?.stripe_subscription_id){await base44.functions.invoke('cancelStripeSubscription',{subscriptionId:subscription.stripe_subscription_id,reason:'User requested'});queryClient.invalidateQueries({queryKey:['subscription']});toast.success('Cancelled');}}} />
                <UsageTracker usageData={usageData} plan={subscription?.plan||'free'} />
                <EmailNotificationSettings />
                <BillingHistory invoices={invoices} />
              </div>
            )}

            {activeSection === 'preferences' && (
              settingsLoading ? (
                <SettingsSectionLoader />
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Personal Preferences</h3>
                    <PersonalPreferencesPanel settingsData={settingsData} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Calendar Integrations</h3>
                    <ExternalCalendarManager />
                  </div>
                </div>
              )
            )}

            {activeSection === 'danger' && (
              <div className="space-y-4">
                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2 text-base">
                      <Trash2 className="w-5 h-5" /> Delete Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 leading-relaxed">
                      <strong>This action is permanent and cannot be undone.</strong> All your data — events, tasks, goals, journal entries, prayer logs, and billing history — will be deleted immediately.
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
    <AccountDeletionDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} userEmail={user?.email} />
    </PullToRefresh>
  );
}