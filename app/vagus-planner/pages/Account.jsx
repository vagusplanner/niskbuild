import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExternalCalendarManager from '@/components/integrations/ExternalCalendarManager';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, CreditCard, Trash2, ArrowLeft, Bell, Calendar, Brain, Heart } from 'lucide-react';
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

export default function Account() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list[0] || null;
    }
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => base44.entities.Subscription.list()
  });
  const subscription = subscriptions[0];

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const { data: usageData = [] } = useQuery({
    queryKey: ['usage', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Usage.filter({ user_email: user.email });
    },
    enabled: !!user?.email
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
      if (settings?.id) {
        return base44.entities.UserSettings.update(settings.id, data);
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
              <div className="space-y-4">
                <NotificationPreferencesPanel />
                <JournalReminderSettings />
              </div>
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
              <div className="space-y-4">
                <div><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Personal Preferences</h3><PersonalPreferencesPanel /></div>
                <div><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Calendar Integrations</h3><ExternalCalendarManager /></div>
              </div>
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