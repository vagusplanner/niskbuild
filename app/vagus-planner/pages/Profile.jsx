import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExternalCalendarManager from '@/components/integrations/ExternalCalendarManager';
import GoalsStrip from '@/components/goals/GoalsStrip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, CheckSquare, AlertCircle, Filter,
  Users, Calendar, Bell, ArrowLeft,
  Activity, Settings, Heart, Brain, CreditCard, Trash2, Plus, ChevronRight, Smartphone
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { toast } from "sonner";

import AIGoalAssistant from '@/components/profile/AIGoalAssistant';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import BulkReprioritizeButton from '@/components/tasks/BulkReprioritizeButton';
import PageAssistant from '@/components/assistant/PageAssistant';
import RelatedFeaturesPanel from '@/components/navigation/RelatedFeaturesPanel';
import UnifiedGamificationTracker from '../components/gamification/UnifiedGamificationTracker';
import SavedItemsBrowser from '@/components/profile/SavedItemsBrowser';
import ProfilePictureUploader from '@/components/profile/ProfilePictureUploader';
import ProductivityInsights from '@/components/profile/ProductivityInsights';
import ExternalIntegrations from '@/components/profile/ExternalIntegrations';
import IslamicProfileSection from '@/components/profile/IslamicProfileSection';
import IslamicAchievementsTracker from '@/components/profile/IslamicAchievementsTracker';
import SpiritualGoalsManager from '@/components/profile/SpiritualGoalsManager';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import UserDetailsCard from '@/components/profile/UserDetailsCard';
import NotificationPreferences from '@/components/profile/NotificationPreferences';
import JournalReminderSettings from '@/components/settings/JournalReminderSettings';
import ActivityHistory from '@/components/profile/ActivityHistory';
import AccountSettings from '@/components/profile/AccountSettings';
import AccountDeletionDialog from '@/components/profile/AccountDeletionDialog';
import PWAWidgetGuide from '@/components/pwa/PWAWidgetGuide';
import PersonalPreferencesPanel from '@/components/profile/PersonalPreferencesPanel';
import EnhancedSubscriptionCard from '@/components/billing/EnhancedSubscriptionCard';
import BillingHistory from '@/components/billing/BillingHistory';
import UsageTracker from '@/components/billing/UsageTracker';
import EmailNotificationSettings from '@/components/billing/EmailNotificationSettings';

export default function ProfilePage() {
  const { t } = useTranslation();
  // Support ?tab=billing or ?tab=settings deep link
  const initialTab = (() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return (tab && ['billing', 'settings', 'preferences', 'insights', 'widgets'].includes(tab)) ? tab : null;
  })();

  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [taskTab, setTaskTab] = useState('all');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '' });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeSection, setActiveSection] = useState(initialTab);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    initialData: []
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: []
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    initialData: []
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 20),
    initialData: []
  });

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const list = await base44.entities.UserSettings.list();
        return list[0] || null;
      } catch (error) {
        return null;
      }
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

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], (old = []) => [
        { ...data, id: `temp-${Date.now()}` },
        ...old
      ]);
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks);
      toast.error('Failed to create task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task created!');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.map(task => task.id === id ? { ...task, ...data } : task)
      );
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      toast.error('Failed to update task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast.success('Task updated!');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old = []) =>
        old.filter(task => task.id !== id)
      );
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['tasks'], context.previousTasks);
      toast.error('Failed to delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted!');
    }
  });

  const handleTaskSubmit = (data) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleToggleTaskStatus = (id, newStatus) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTaskMutation.mutate({ id, data: { ...task, status: newStatus } });
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditingProfile(false);
      toast.success('Profile updated!');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings && settings.id) {
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

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleToggleSetting = (key, value) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  React.useEffect(() => {
    if (user) {
      setProfileData({ full_name: user.full_name || '' });
    }
  }, [user]);

  const filterTasks = (taskList, status) => {
    let filtered = taskList;
    if (status !== 'all') {
      if (status === 'my_tasks' && user) {
        filtered = filtered.filter(t => t.created_by === user.email || t.assigned_to === user.email);
      } else if (status === 'delegated' && user) {
        filtered = filtered.filter(t => t.assigned_to && t.assigned_to !== user.email);
      } else {
        filtered = filtered.filter(t => t.status === status);
      }
    }
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === filterPriority);
    return filtered;
  };

  const myTeams = teams.filter(t => 
    t.created_by === user?.email || 
    teamMembers.some(m => m.team_id === t.id && m.user_email === user?.email)
  );

  const recentActivity = [
    ...events.slice(0, 5).map(e => ({ type: 'event', title: e.title, date: e.created_date, icon: Calendar })),
    ...tasks.slice(0, 5).map(t => ({ type: 'task', title: t.title, date: t.created_date, icon: CheckSquare })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const filteredTasks = filterTasks(tasks, taskTab);
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length
  };

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['teams'] }),
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['userSettings'] })
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen pb-safe">
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-3 sm:px-5 py-4 lg:py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-teal-200" />
                <span className="text-xs font-bold text-teal-200 uppercase tracking-widest">Account</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">{t('nav.account')}</h1>
              <p className="text-sm text-teal-100 mt-1">{t('profile.title')}, {t('billing.title')} & {t('settings.title')}</p>
              <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>

          {/* User hero card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-700 p-5 shadow-lg shadow-teal-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-black text-white shadow-inner">
                  {(user?.full_name || user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white text-lg leading-tight">{user?.full_name || 'Your Account'}</p>
                  <p className="text-teal-100 text-sm">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('tasks.title'), value: tasks.length },
                  { label: t('nav.calendar'), value: events.length },
                  { label: t('tasks.overdue'), value: taskStats.overdue },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center">
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <p className="text-xs text-teal-100">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section tiles — same drill-down pattern as Islam / Wellness */}
        {(() => {
          const SECTIONS = [
            { id: 'profile',     icon: User,        label: t('profile.title'),      sub: t('profile.editProfile'),         gradient: 'from-teal-500 to-emerald-600',   glow: 'shadow-teal-400/30' },
            { id: 'settings',    icon: Settings,     label: t('settings.title'),     sub: t('settings.subtitle'),   gradient: 'from-slate-500 to-slate-700',    glow: 'shadow-slate-400/30' },
            { id: 'billing',     icon: CreditCard,   label: t('billing.title'),      sub: t('billing.currentPlan'),       gradient: 'from-violet-500 to-indigo-600',  glow: 'shadow-violet-400/30' },
            { id: 'preferences', icon: Heart,        label: t('profile.preferences'),  sub: t('settings.dietary'),        gradient: 'from-rose-500 to-pink-600',      glow: 'shadow-rose-400/30' },
            { id: 'insights',    icon: Brain,        label: t('wellness.insights'),     sub: t('ai.insights'),       gradient: 'from-purple-500 to-violet-600',  glow: 'shadow-purple-400/30' },
            { id: 'widgets',     icon: Smartphone,   label: 'Widgets & Home Screen',    sub: 'Lock screen, notifications',  gradient: 'from-teal-400 to-cyan-500',      glow: 'shadow-teal-400/30' },
          ];

          const activeId = activeSection || initialTab;
          const section = SECTIONS.find(s => s.id === activeId);

          if (activeSection) {
            return (
              <motion.div key="section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                </button>
                <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${section.gradient} shadow-md`}>
                  <div className="p-2.5 bg-white/20 rounded-xl"><section.icon className="w-5 h-5 text-white" /></div>
                  <h2 className="text-lg font-black text-white">{section.label}</h2>
                </div>

                {activeSection === 'profile' && <><AccountSettings user={user} onUpdate={(data) => updateProfileMutation.mutate(data)} isSaving={updateProfileMutation.isPending} /><UnifiedGamificationTracker compact /><GoalsStrip limit={3} linkTo="Wellness" /></>}

                {activeSection === 'settings' && (
                  <div className="space-y-4">
                    {[
                      { title: t('profile.notifications'), icon: Bell, color: 'text-teal-600', fields: [
                       { type: 'switch', label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc'), key: 'notifications_enabled', default: true },
                       { type: 'switch', label: t('settings.emailNotifications'), desc: t('settings.emailNotificationsDesc'), key: 'email_notifications', default: true },
                       { type: 'switch', label: t('settings.doNotDisturb'), desc: t('settings.doNotDisturbDesc'), key: 'do_not_disturb', default: false },
                       { type: 'select', label: t('settings.notificationSound'), key: 'notification_sound', default: 'default', options: ['default','chime','bell','ding','none'] },
                       { type: 'select', label: t('settings.notifyBefore'), key: 'notify_before_minutes', default: '15', options: [{v:'5',l:'5 min'},{v:'10',l:'10 min'},{v:'15',l:'15 min'},{v:'30',l:'30 min'},{v:'60',l:'1 hour'}] },
                      ]},
                      { title: t('nav.calendar'), icon: Calendar, color: 'text-amber-600', fields: [
                       { type: 'select', label: t('settings.defaultView'), key: 'default_calendar_view', default: 'month', options: ['month','week','day'] },
                       { type: 'select', label: t('settings.weekStartsOn'), key: 'week_starts_on', default: 'monday', options: ['sunday','monday','saturday'] },
                       { type: 'switch', label: t('settings.showHijriDates'), desc: t('settings.showHijriDatesDesc'), key: 'show_hijri_dates', default: true },
                      ]},
                      { title: t('settings.aiAssistant'), icon: Brain, color: 'text-purple-600', fields: [
                       { type: 'select', label: t('settings.responseTone'), key: 'ai_response_tone', default: 'friendly', options: ['professional','friendly','casual','formal'] },
                       { type: 'switch', label: t('settings.proactiveSuggestions'), desc: t('settings.proactiveSuggestionsDesc'), key: 'ai_proactive_suggestions', default: true },
                      ]},
                    ].map(group => (
                      <Card key={group.title} className="border-slate-100 dark:border-slate-800">
                        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><group.icon className={`w-4 h-4 ${group.color}`} />{group.title}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          {group.fields.map(f => f.type === 'switch' ? (
                            <div key={f.key} className="flex items-center justify-between">
                              <div><Label className="text-sm font-medium">{f.label}</Label>{f.desc&&<p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>}</div>
                              <Switch checked={f.default !== false ? settings?.[f.key] !== false : (settings?.[f.key] || false)} onCheckedChange={(val)=>handleToggleSetting(f.key, val)} />
                            </div>
                          ) : (
                            <div key={f.key} className="space-y-1.5">
                              <Label className="text-sm">{f.label}</Label>
                              <Select value={String(settings?.[f.key] || f.default)} onValueChange={(val)=>handleToggleSetting(f.key, val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{(f.options||[]).map(o=>typeof o==='string'?<SelectItem key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</SelectItem>:<SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                    <NotificationPreferences settings={settings} onUpdate={(data)=>updateSettingsMutation.mutate(data)} />
                    <JournalReminderSettings />
                    <Card className="border-red-200 dark:border-red-900">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div><p className="font-semibold text-red-700 dark:text-red-400 text-sm">{t('profile.deleteAccount')}</p><p className="text-xs text-slate-400 mt-0.5">{t('profile.deleteAccountDesc')}</p></div>
                        <Button variant="outline" size="sm" onClick={()=>setShowDeleteDialog(true)} className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="w-4 h-4 mr-1" />{t('common.delete')}</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeSection === 'billing' && (
                  <div className="space-y-6">
                    <EnhancedSubscriptionCard subscription={subscription||{plan:'free',status:'active',user_email:user?.email}} usageData={usageData}
                      onManage={async()=>{try{const{data}=await base44.functions.invoke('createCustomerPortalSession');if(data?.portalUrl)window.location.href=data.portalUrl;else toast.error(data?.error||'Failed')}catch{toast.error('Failed to open portal')}}}
                      onUpgrade={()=>{window.location.href='/Billing';}}
                      onCancel={async()=>{if(subscription?.stripe_subscription_id){await base44.functions.invoke('cancelStripeSubscription',{subscriptionId:subscription.stripe_subscription_id,reason:'User requested'});queryClient.invalidateQueries({queryKey:['subscription']});toast.success('Cancelled');}}} />
                    <UsageTracker usageData={usageData} plan={subscription?.plan||'free'} />
                    <EmailNotificationSettings />
                    <BillingHistory invoices={invoices} onViewInvoice={()=>toast.info('Invoice details')} onDownloadInvoice={(inv)=>{if(inv.pdf_url)window.open(inv.pdf_url,'_blank');}} />
                  </div>
                )}

                {activeSection === 'preferences' && (
                  <div className="space-y-6">
                    <div><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{t('profile.personalPreferences')}</h3><p className="text-xs text-slate-400 mb-4">{t('profile.personalPreferencesDesc')}</p><PersonalPreferencesPanel /></div>
                    <div><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{t('profile.calendarIntegrations')}</h3><p className="text-xs text-slate-400 mb-4">{t('profile.calendarIntegrationsDesc')}</p><ExternalCalendarManager /></div>
                  </div>
                )}

                {activeSection === 'widgets' && <PWAWidgetGuide />}

                {activeSection === 'insights' && (
                  <div className="space-y-6">
                    <ProductivityInsights />
                    <ActivityHistory />
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4 text-teal-600" />{t('profile.teams')}</CardTitle></CardHeader>
                      <CardContent>
                        {myTeams.length>0?<div className="space-y-2">{myTeams.map(team=>{const mc=teamMembers.filter(m=>m.team_id===team.id).length;return(<div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-teal-600" /></div><div><p className="font-medium text-sm text-slate-800 dark:text-slate-100">{team.name}</p><p className="text-xs text-slate-400">{mc} {t('connect.contacts')}</p></div></div>{team.created_by===user?.email&&<Badge className="bg-teal-100 text-teal-700 border-0 text-xs">{t('nav.admin')}</Badge>}</div>);})}</div>:<p className="text-center text-slate-400 py-8 text-sm">{t('profile.noTeams')}</p>}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            );
          }

          return (
            <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.view')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SECTIONS.map(s => (
                  <motion.button
                    key={s.id}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection(s.id)}
                    className={`group relative overflow-hidden rounded-2xl p-4 text-left bg-gradient-to-br ${s.gradient} shadow-md ${s.glow} hover:shadow-xl transition-all w-full`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl w-fit"><s.icon className="w-5 h-5 text-white" /></div>
                      <div><p className="text-sm font-bold text-white leading-tight">{s.label}</p><p className="text-xs text-white/70 mt-0.5">{s.sub}</p></div>
                    </div>
                    <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </div>
    </div>

    <AccountDeletionDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} userEmail={user?.email} />
    <AIGoalAssistant isOpen={showAIAssistant} onClose={() => { setShowAIAssistant(false); setSelectedGoal(null); }}
      goal={selectedGoal} />
    <TaskForm isOpen={showTaskForm} onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
      onSubmit={handleTaskSubmit} task={editingTask} />
    </PullToRefresh>
  );
}