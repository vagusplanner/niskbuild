import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, CheckCircle2, Circle, Trash2, User, Calendar, Flag, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending:     { label: 'To Do',       color: 'text-slate-400',   dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'text-amber-400',   dot: 'bg-amber-400' },
  completed:   { label: 'Done',        color: 'text-teal-400',    dot: 'bg-teal-400' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-400/50',  dot: 'bg-red-400/50' },
};

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  low:    { label: 'Low',    color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20' },
};

const CATEGORIES = [
  { key: 'chores',   emoji: '🧹' },
  { key: 'errands',  emoji: '🛒' },
  { key: 'cooking',  emoji: '🍳' },
  { key: 'finances', emoji: '💰' },
  { key: 'school',   emoji: '📚' },
  { key: 'other',    emoji: '📌' },
];

function notify(qc, { groupId, type, actorEmail, actorName, targetEmail, message, entityId }) {
  base44.entities.FamilyNotification.create({
    family_group_id: groupId,
    type, actor_email: actorEmail, actor_name: actorName,
    target_email: targetEmail || '', message,
    entity_id: entityId || '', entity_type: 'FamilyTask', is_read_by: [],
  }).then(() => qc.invalidateQueries(['familyNotifications', groupId])).catch(() => {});
}

export default function FamilyTaskBoard({ groupId, user, memberEmails = [], memberNames = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', category: 'other', priority: 'medium', assigned_to_email: '', due_date: '' });
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['familyTasks', groupId],
    queryFn: () => base44.entities.FamilyTask.filter({ family_group_id: groupId }),
    enabled: !!groupId,
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.FamilyTask.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(['familyTasks', groupId]);
      const assigneeName = memberNames[memberEmails.indexOf(form.assigned_to_email)] || form.assigned_to_email;
      if (form.assigned_to_email && form.assigned_to_email !== user.email) {
        notify(qc, { groupId, type: 'task_assigned', actorEmail: user.email, actorName: user.full_name, targetEmail: form.assigned_to_email, message: `${user.full_name} assigned "${form.title}" to ${assigneeName}`, entityId: created?.id });
      }
      setForm({ title: '', category: 'other', priority: 'medium', assigned_to_email: '', due_date: '' });
      setShowForm(false);
      toast.success('Task added!');
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyTask.update(id, data),
    onSuccess: (_, { data, task }) => {
      qc.invalidateQueries(['familyTasks', groupId]);
      if (data.status === 'completed') {
        notify(qc, { groupId, type: 'task_completed', actorEmail: user.email, actorName: user.full_name, message: `${user.full_name} completed "${task.title}"` });
      }
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.FamilyTask.delete(id),
    onSuccess: () => { qc.invalidateQueries(['familyTasks', groupId]); toast.success('Task removed'); },
  });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    createTask.mutate({
      ...form,
      family_group_id: groupId,
      assigned_by_email: user?.email,
      assigned_by_name: user?.full_name || user?.email,
      assigned_to_name: memberNames[memberEmails.indexOf(form.assigned_to_email)] || form.assigned_to_email,
    });
  };

  const filtered = tasks.filter(t => {
    if (filterAssignee !== 'all' && t.assigned_to_email !== filterAssignee) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const pending   = filtered.filter(t => t.status === 'pending');
  const progress  = filtered.filter(t => t.status === 'in_progress');
  const completed = filtered.filter(t => t.status === 'completed');

  const TaskCard = ({ task }) => {
    const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const cat = CATEGORIES.find(c => c.key === task.category) || CATEGORIES[5];
    const isDone = task.status === 'completed';
    const isMyTask = task.assigned_to_email === user?.email;

    return (
      <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className={`group p-3 rounded-2xl border transition-all ${isDone ? 'opacity-40 bg-white/[0.01] border-white/5' : 'bg-white/[0.04] border-white/10 hover:border-white/20'}`}>
        <div className="flex items-start gap-2.5">
          <button onClick={() => updateTask.mutate({ id: task.id, data: { status: isDone ? 'pending' : 'completed' }, task })} className="mt-0.5 flex-shrink-0 transition-transform active:scale-90">
            {isDone
              ? <CheckCircle2 className="w-4.5 h-4.5 text-teal-400" />
              : <Circle className="w-4.5 h-4.5 text-white/25 hover:text-teal-400 transition-colors" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${isDone ? 'line-through text-white/30' : 'text-white'}`}>{task.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px]">{cat.emoji}</span>
              {task.assigned_to_name && (
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />{task.assigned_to_name}
                  {isMyTask && <span className="text-teal-400/70 font-bold">· You</span>}
                </span>
              )}
              {task.due_date && (
                <span className="text-[10px] text-white/35 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />{format(new Date(task.due_date), 'd MMM')}
                </span>
              )}
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${pri.bg} ${pri.color}`}>{pri.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isDone && (
              <select value={task.status} onChange={e => updateTask.mutate({ id: task.id, data: { status: e.target.value }, task })}
                className="text-[10px] bg-white/5 border border-white/10 text-white/60 rounded-lg px-1.5 py-1 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity">
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'cancelled').map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#071224]">{v.label}</option>
                ))}
              </select>
            )}
            <button onClick={() => deleteTask.mutate(task.id)} className="p-1 text-white/15 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setShowForm(s => !s)} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1 h-9">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </Button>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-xl px-3 py-2 focus:outline-none">
          <option value="all" className="bg-[#071224]">All members</option>
          {memberEmails.map((email, i) => (
            <option key={email} value={email} className="bg-[#071224]">{memberNames[i] || email}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-xl px-3 py-2 focus:outline-none">
          <option value="all" className="bg-[#071224]">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k} className="bg-[#071224]">{v.label}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2 text-center">
          {[['To Do', pending.length, 'text-slate-400'], ['Active', progress.length, 'text-amber-400'], ['Done', completed.length, 'text-teal-400']].map(([l, v, c]) => (
            <div key={l} className="bg-white/[0.03] border border-white/8 rounded-xl px-3 py-1.5">
              <p className={`text-base font-black ${c}`}>{v}</p>
              <p className="text-[9px] text-white/30">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white/[0.04] border border-white/15 rounded-3xl p-4 space-y-3">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title…" className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <div className="flex gap-2 flex-wrap">
              <select value={form.assigned_to_email} onChange={e => setForm(f => ({ ...f, assigned_to_email: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
                <option value="" className="bg-[#071224]">Assign to…</option>
                {memberEmails.map((email, i) => (
                  <option key={email} value={email} className="bg-[#071224]">{memberNames[i] || email}</option>
                ))}
              </select>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#071224]">{v.label}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
                {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-[#071224]">{c.emoji} {c.key}</option>)}
              </select>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="bg-white/5 border-white/15 text-white text-xs" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1 border-white/15 text-white/50 bg-transparent">Cancel</Button>
              <Button onClick={handleAdd} size="sm" disabled={createTask.isPending} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Task
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Columns */}
      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/8 rounded-3xl">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-white/40 text-sm">No tasks found. Add one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[[pending, 'To Do', 'text-slate-300'], [progress, 'In Progress', 'text-amber-300'], [completed, 'Done', 'text-teal-300']].map(([items, label, cls]) =>
            items.length > 0 ? (
              <div key={label}>
                <p className={`text-xs font-black uppercase tracking-widest px-1 mb-2 ${cls}`}>{label} ({items.length})</p>
                <div className="space-y-1.5">
                  {items.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}