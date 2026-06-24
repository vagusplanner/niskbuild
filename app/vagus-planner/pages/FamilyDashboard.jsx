import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ShoppingCart, Heart, Calendar, Crown, Home, CheckSquare, Bell, PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import FamilyTaskBoard from '@/components/family/FamilyTaskBoard';
import FamilyNotificationCenter from '@/components/family/FamilyNotificationCenter';
import FamilyCalendarApproval from '@/components/family/FamilyCalendarApproval';

import FamilyInvite from '@/components/family/FamilyInvite';
import FamilyGroceryList from '@/components/family/FamilyGroceryList';
import FamilySadaqahPot from '@/components/family/FamilySadaqahPot';
import FamilyCalendarView from '@/components/family/FamilyCalendarView';

const TABS = [
  { id: 'members',  label: 'Members',  icon: Users,        desc: 'Invite & manage' },
  { id: 'budget',   label: 'Budget',   icon: PieChart,     desc: 'Track spending' },
  { id: 'tasks',    label: 'Tasks',    icon: CheckSquare,  desc: 'Assigned chores' },
  { id: 'calendar', label: 'Calendar', icon: Calendar,     desc: 'Shared events' },
  { id: 'grocery',  label: 'Grocery',  icon: ShoppingCart, desc: 'Shared list' },
  { id: 'sadaqah',  label: 'Sadaqah',  icon: Heart,        desc: 'Collective giving' },
  { id: 'activity', label: 'Activity', icon: Bell,         desc: 'Notifications' },
];

function FamilyDashboardInner() {
  const [activeTab, setActiveTab] = useState('members');
  const qc = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: familyGroups = [], isLoading } = useQuery({
    queryKey: ['familyGroup'],
    queryFn: () => base44.entities.FamilyGroup.list(),
    enabled: !!user,
  });

  // Find the group the current user belongs to
  const group = familyGroups.find(g =>
    g.admin_email === user?.email || (g.member_emails || []).includes(user?.email)
  ) || null;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-900/40 via-emerald-900/30 to-teal-800/20 border border-teal-400/25 p-6 shadow-2xl">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%233ecfa0' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🏡</span>
                  <span className="text-[10px] font-black bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Family Hub</span>
                </div>
                <h1 className="text-3xl font-black text-white mb-1">
                  {group ? group.name : 'Family Dashboard'}
                </h1>
                <p className="text-white/60 text-sm">
                  {group
                    ? `${group.member_emails?.length || 1} members · Grocery list · Sadaqah jar · Shared calendar`
                    : 'Create or join a family group to get started'}
                </p>
              </div>
              {group && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-teal-400/70 font-bold uppercase">Invite Code</p>
                  <p className="text-2xl font-black text-teal-300 tracking-widest font-mono">{group.invite_code}</p>
                </div>
              )}
            </div>

            {group && (
              <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {(group.member_emails || []).slice(0, 8).map((email, i) => {
                  const name = group.member_names?.[i] || email;
                  return (
                    <div key={email} className="flex-shrink-0 flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-sm ring-2 ring-teal-400/30">
                        {(name[0] || '?').toUpperCase()}
                      </div>
                      <p className="text-[9px] text-white/40 max-w-[40px] truncate text-center">{name.split(' ')[0]}</p>
                    </div>
                  );
                })}
                {(group.member_emails?.length || 0) > 8 && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                    +{group.member_emails.length - 8}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {TABS.map(({ id, label, icon: Icon, desc }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-center transition-all ${
                activeTab === id
                  ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                  : 'bg-white/[0.02] border-white/8 text-white/40 hover:text-white hover:border-white/15'
              }`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-black leading-tight">{label}</span>
              <span className="text-[9px] opacity-60 hidden sm:block">{desc}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeTab === 'members' && (
              <FamilyInvite group={group} user={user} onGroupUpdate={() => qc.invalidateQueries(['familyGroup'])} />
            )}

            {activeTab === 'grocery' && (
              group ? (
                <FamilyGroceryList groupId={group.id} user={user} />
              ) : (
                <NoGroupPrompt tab="grocery" onSwitch={() => setActiveTab('members')} />
              )
            )}

            {activeTab === 'sadaqah' && (
              group ? (
                <FamilySadaqahPot groupId={group.id} user={user} />
              ) : (
                <NoGroupPrompt tab="sadaqah" onSwitch={() => setActiveTab('members')} />
              )
            )}

            {activeTab === 'activity' && (
              group ? (
                <FamilyNotificationCenter groupId={group.id} userEmail={user?.email} />
              ) : (
                <NoGroupPrompt tab="activity" onSwitch={() => setActiveTab('members')} />
              )
            )}

            {activeTab === 'tasks' && (
              group ? (
                <FamilyTaskBoard
                  groupId={group.id}
                  user={user}
                  memberEmails={group.member_emails || []}
                  memberNames={group.member_names || []}
                />
              ) : (
                <NoGroupPrompt tab="tasks" onSwitch={() => setActiveTab('members')} />
              )
            )}

            {activeTab === 'budget' && (
              group ? (
                <div className="text-center py-10 bg-white/[0.02] border border-white/8 rounded-3xl space-y-3">
                  <PieChart className="w-10 h-10 text-teal-400 mx-auto" />
                  <p className="font-black text-white text-lg">Family Budget Tracker</p>
                  <p className="text-white/50 text-sm">Log expenses, set limits & get AI savings tips</p>
                  <Link to="/FamilyBudget">
                    <button className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm mt-2">Open Budget Tracker →</button>
                  </Link>
                </div>
              ) : (
                <NoGroupPrompt tab="budget" onSwitch={() => setActiveTab('members')} />
              )
            )}

            {activeTab === 'calendar' && (
              group ? (
                <FamilyCalendarApproval
                  groupId={group.id}
                  user={user}
                  isAdmin={group.admin_email === user?.email}
                  memberEmails={group.member_emails || []}
                  memberNames={group.member_names || []}
                />
              ) : (
                <NoGroupPrompt tab="calendar" onSwitch={() => setActiveTab('members')} />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NoGroupPrompt({ tab, onSwitch }) {
  return (
    <div className="text-center py-16 bg-white/[0.02] border border-white/8 rounded-3xl">
      <div className="text-4xl mb-3">🏡</div>
      <h3 className="font-black text-white text-lg mb-2">No Family Group Yet</h3>
      <p className="text-white/50 text-sm mb-5">Create or join a family group to access the {tab} feature.</p>
      <button onClick={onSwitch} className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm">
        Set Up Family Group →
      </button>
    </div>
  );
}

export default function FamilyDashboardPage() {
  return (
    <IslamicEditionGate page>
      <FamilyDashboardInner />
    </IslamicEditionGate>
  );
}