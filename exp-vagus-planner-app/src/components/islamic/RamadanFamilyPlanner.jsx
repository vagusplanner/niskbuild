import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Clock, Moon, Star, ChevronDown, ChevronUp, Utensils, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const DEFAULT_MEMBERS = ['Father', 'Mother'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RamadanFamilyPlanner() {
  const [tab, setTab] = useState('iftar');
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [newMember, setNewMember] = useState('');
  const [iftarSchedule, setIftarSchedule] = useState(
    DAYS_OF_WEEK.map(day => ({ day, host: '', menu: '', guests: '', time: '19:30', notes: '' }))
  );
  const [goals, setGoals] = useState([
    { id: 1, member: 'Family', goal: 'Complete Quran together', target: 30, completed: 0, unit: 'juz', color: 'emerald' },
    { id: 2, member: 'Family', goal: 'Pray Tarawih every night', target: 30, completed: 0, unit: 'nights', color: 'indigo' },
  ]);
  const [newGoal, setNewGoal] = useState({ member: '', goal: '', target: '', unit: 'days', color: 'teal' });

  const updateIftar = (day, field, value) => {
    setIftarSchedule(s => s.map(d => d.day === day ? { ...d, [field]: value } : d));
  };

  const addMember = () => {
    if (newMember.trim()) { setMembers(m => [...m, newMember.trim()]); setNewMember(''); }
  };

  const addGoal = () => {
    if (!newGoal.goal.trim()) return;
    setGoals(g => [...g, { id: Date.now(), ...newGoal, target: parseFloat(newGoal.target) || 30, completed: 0 }]);
    setNewGoal({ member: '', goal: '', target: '', unit: 'days', color: 'teal' });
  };

  const progressGoal = (id, delta) => {
    setGoals(g => g.map(x => x.id === id ? { ...x, completed: Math.max(0, Math.min(x.target, x.completed + delta)) } : x));
  };

  const colors = {
    emerald: 'bg-emerald-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500',
    amber: 'bg-amber-500', rose: 'bg-rose-500', violet: 'bg-violet-500',
  };

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 to-violet-700 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Users className="w-5 h-5 text-indigo-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Ramadan Family Planner</h3>
          <p className="text-xs text-indigo-200">Shared Iftar schedule · Family goals · Suhoor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {[{ id: 'iftar', label: '🌙 Iftar Schedule' }, { id: 'goals', label: '🎯 Family Goals' }, { id: 'members', label: '👥 Members' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.id ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Iftar Schedule Tab */}
        {tab === 'iftar' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Plan who hosts Iftar each day, the menu, and invited guests.</p>
            {iftarSchedule.map(day => (
              <div key={day.day} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 w-8">{day.day}</span>
                  <Input value={day.host} onChange={e => updateIftar(day.day, 'host', e.target.value)}
                    placeholder="Host name" className="h-7 text-xs flex-1" />
                  <input type="time" value={day.time} onChange={e => updateIftar(day.day, 'time', e.target.value)}
                    className="h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2 px-3 pb-2.5 pt-1.5">
                  <Input value={day.menu} onChange={e => updateIftar(day.day, 'menu', e.target.value)}
                    placeholder="Menu / dish" className="h-7 text-xs" />
                  <Input value={day.guests} onChange={e => updateIftar(day.day, 'guests', e.target.value)}
                    placeholder="Guest names" className="h-7 text-xs" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Family Goals Tab */}
        {tab === 'goals' && (
          <div className="space-y-3">
            {goals.map(goal => {
              const pct = Math.round((goal.completed / goal.target) * 100);
              return (
                <div key={goal.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{goal.goal}</p>
                      {goal.member && <p className="text-xs text-slate-500">{goal.member}</p>}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{goal.completed}/{goal.target} {goal.unit}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${colors[goal.color] || 'bg-teal-500'}`}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{pct}% complete</span>
                    <div className="flex gap-1">
                      <button onClick={() => progressGoal(goal.id, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center hover:bg-slate-300 transition-colors">-</button>
                      <button onClick={() => progressGoal(goal.id, 1)} className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-bold text-sm flex items-center justify-center hover:bg-indigo-600 transition-colors">+</button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-3 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Add Family Goal</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={newGoal.member} onChange={e => setNewGoal(p => ({...p, member: e.target.value}))} placeholder="Who (optional)" className="h-7 text-xs" />
                <Input value={newGoal.goal} onChange={e => setNewGoal(p => ({...p, goal: e.target.value}))} placeholder="Goal description" className="h-7 text-xs" />
                <Input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({...p, target: e.target.value}))} placeholder="Target" className="h-7 text-xs" />
                <select value={newGoal.unit} onChange={e => setNewGoal(p => ({...p, unit: e.target.value}))}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none">
                  <option>days</option><option>juz</option><option>pages</option><option>prayers</option><option>nights</option>
                </select>
              </div>
              <Button onClick={addGoal} size="sm" className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-3 h-3 mr-1" />Add Goal
              </Button>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Add family members to personalise the planner.</p>
            <div className="space-y-1.5">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                  <Star className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{m}</span>
                  <button onClick={() => setMembers(x => x.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newMember} onChange={e => setNewMember(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
                placeholder="Add family member…" className="h-9 text-sm flex-1" />
              <Button onClick={addMember} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}