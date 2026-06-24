import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sun, Map, Heart, Hash, Copy, Loader2, Crown, MessageCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import FamilySetup from '@/components/family/FamilySetup';
import FamilyPrayerGoals from '@/components/family/FamilyPrayerGoals';
import FamilyHajjPlanner from '@/components/family/FamilyHajjPlanner';
import FamilyZakatLedger from '@/components/family/FamilyZakatLedger';
import FamilyHubOnboarding from '@/components/family/FamilyHubOnboarding';
import FamilyHajjSavings from '@/components/family/FamilyHajjSavings';
import { ErrorState } from '@/components/family/FamilyErrorState';
import FamilyGroupChat from '@/components/family/FamilyGroupChat';
import { trackPageView, GA } from '@/lib/ga4';

const TABS = [
  { id: 'prayer', label: 'Prayer Goals', icon: Sun, color: 'text-amber-500' },
  { id: 'hajj', label: 'Hajj Plan', icon: Map, color: 'text-rose-500' },
  { id: 'zakat', label: 'Zakat & Charity', icon: Heart, color: 'text-pink-500' },
  { id: 'chat', label: 'Family Chat', icon: MessageCircle, color: 'text-teal-500' },
];

function FamilyHubContent() {
  const [tab, setTab] = useState('prayer');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => SDK.auth.me() });

  const { data: groups = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['familyGroup', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await SDK.entities.FamilyGroup.list('-created_date', 50);
      return all.filter(g => g.member_emails?.includes(user.email));
    },
    enabled: !!user?.email,
  });

  const group = groups[0];

  // GA4 page view
  useEffect(() => { trackPageView('/FamilyHub', 'Family Hub'); }, []);

  // Show onboarding once
  useEffect(() => {
    if (group && !localStorage.getItem('family_hub_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, [group]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    toast.success('Invite code copied!');
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1D6FB8]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <ErrorState message="Could not load your family group." onRetry={refetch} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <FamilySetup user={user} onDone={() => queryClient.invalidateQueries({ queryKey: ['familyGroup'] })} />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <FamilyHubOnboarding onDone={() => setShowOnboarding(false)} />}
      </AnimatePresence>

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-5 py-4 lg:py-6 space-y-6">

        {/* Back link */}
        <div className="flex items-center">
          <Link to={createPageUrl('Islam')} className="flex items-center gap-2 text-sm font-semibold transition-colors min-h-[44px] px-2 py-1 rounded-xl hover:bg-[#D4E0EC]" style={{color:'#1D6FB8'}}>
            <ArrowLeft className="w-4 h-4" /> Back to Islam
          </Link>
        </div>

        {/* Family header card */}
        <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg" style={{background:'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 55%, #1D6FB8 100%)', border:'1px solid rgba(41,171,226,0.3)'}}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v5h5v5H0v5h20v-9.5zM10 28H5v-5h5v5zm10 0h-5v-5h5v5zm0-10H5v-5h15v5z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white">{group.name}</h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3 h-3 text-[#A8C8E8]" />
                    <span className="text-xs text-[#A8C8E8]">{group.member_emails?.length || 0} members</span>
                    {group.admin_email === user.email && (
                      <Badge className="bg-amber-400/80 text-amber-900 border-0 text-[10px] flex items-center gap-1 ml-1">
                        <Crown className="w-2.5 h-2.5" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2 transition-all">
                <Hash className="w-3.5 h-3.5 text-white" />
                <span className="text-white font-mono font-bold text-sm tracking-widest">{group.invite_code}</span>
                <Copy className="w-3 h-3 text-white/70" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(group.member_names || []).map((name, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all',
                tab === id ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}>
              <Icon className={cn('w-3.5 h-3.5', tab === id ? color : 'text-current')} />
              <span className={tab === id ? color : ''}>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-4 shadow-sm">
            {tab === 'prayer' && <FamilyPrayerGoals group={group} user={user} />}
            {tab === 'hajj' && (
              <div className="space-y-6">
                <FamilyHajjSavings group={group} user={user} />
                <FamilyHajjPlanner group={group} user={user} />
              </div>
            )}
            {tab === 'zakat' && <FamilyZakatLedger group={group} user={user} />}
            {tab === 'chat' && <FamilyGroupChat group={group} user={user} />}
          </motion.div>
        </AnimatePresence>

      </div>
    </>
  );
}

export default function FamilyHub() {
  return (
    <IslamicEditionGate page>
      <FamilyHubContent />
    </IslamicEditionGate>
  );
}