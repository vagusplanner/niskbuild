import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Users, Settings, ChevronRight, ArrowLeft, BarChart2, CheckCircle2, Clock, MessageSquare, Crown, Shield, Eye, UserPlus, Trash2, Mic } from 'lucide-react';
import CommentThread from '@/components/collaboration/CommentThread';
import VoiceTaskInput from '@/components/tasks/VoiceTaskInput';
import { format } from 'date-fns';

const ROLE_CONFIG = {
  owner:  { label: 'Owner',  icon: Crown,  color: 'bg-amber-100 text-amber-800',  desc: 'Full control' },
  admin:  { label: 'Admin',  icon: Shield, color: 'bg-blue-100 text-blue-800',    desc: 'Manage tasks & members' },
  member: { label: 'Member', icon: Users,  color: 'bg-green-100 text-green-800',  desc: 'Create & edit tasks' },
  viewer: { label: 'Viewer', icon: Eye,    color: 'bg-slate-100 text-slate-700',  desc: 'Read only' },
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
};

function canEdit(myRole) { return ['owner', 'admin', 'member'].includes(myRole); }
function canManage(myRole) { return ['owner', 'admin'].includes(myRole); }

// ── Team List ────────────────────────────────────────────────────────────────
function TeamList({ user, onSelect }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const { data: memberships = [] } = useQuery({
    queryKey: ['myTeamMemberships', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ user_email: user.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', memberships.map(m => m.team_id).join(',')],
    queryFn: async () => {
      if (!memberships.length) return [];
      const all = await Promise.all(memberships.map(m =>
        base44.entities.Team.filter({ id: m.team_id }).catch(() => [])
      ));
      return all.flat();
    },
    enabled: memberships.length > 0,
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      const team = await base44.entities.Team.create({
        name: name.trim(),
        description: desc.trim(),
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: 'owner',
        status: 'active',
      });
      return team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myTeamMemberships'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      setCreating(false); setName(''); setDesc('');
      toast.success('Team created!');
    },
  });

  const myRoleFor = (teamId) => memberships.find(m => m.team_id === teamId)?.role || 'member';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">My Teams</h2>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-2 bg-[#1D6FB8] hover:bg-[#2980B9]">
          <Plus className="w-4 h-4" /> New Team
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-[#29ABE2]/30 shadow-md space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Create a new team</h3>
            <Input placeholder="Team name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => createTeam.mutate()} disabled={!name.trim() || createTeam.isPending} className="bg-[#1D6FB8]">
                {createTeam.isPending ? 'Creating…' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {teams.length === 0 && !creating && (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No teams yet</h3>
          <p className="text-slate-400 mt-1">Create a team to collaborate on tasks</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {teams.map(team => {
          const role = myRoleFor(team.id);
          const RoleIcon = ROLE_CONFIG[role]?.icon || Users;
          return (
            <motion.button key={team.id} whileHover={{ y: -2 }}
              onClick={() => onSelect(team, role)}
              className="text-left p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#29ABE2]/50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{team.name}</h3>
                  {team.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{team.description}</p>}
                </div>
                <Badge className={ROLE_CONFIG[role]?.color}>
                  <RoleIcon className="w-3 h-3 mr-1" />{ROLE_CONFIG[role]?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-3 text-[#1D6FB8]">
                <span className="text-xs font-medium">Open workspace</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Team Workspace ───────────────────────────────────────────────────────────
function TeamWorkspaceView({ team, myRole, user, onBack }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('tasks');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showVoice, setShowVoice] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers', team.id],
    queryFn: () => base44.entities.TeamMember.filter({ team_id: team.id }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['teamTasks', team.id],
    queryFn: () => base44.entities.Task.filter({ team_id: team.id }, '-created_date'),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim().toLowerCase();
      const existing = members.find(m => m.user_email === email);
      if (existing) { toast.error('Already a member'); return; }
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_email: email,
        role: inviteRole,
        status: 'invited',
        invited_by: user.email,
      });
      // Send invite email via existing function
      await base44.functions.invoke('inviteToConnect', { email, message: `You've been invited to join the team "${team.name}" on Vagus Planner.` }).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teamMembers', team.id] });
      setInviteEmail(''); toast.success('Invite sent!');
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: ({ id, role }) => base44.entities.TeamMember.update(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamMembers', team.id] }),
  });

  const removeMember = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.update(id, { status: 'left' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teamMembers', team.id] }); toast.success('Member removed'); },
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, team_id: team.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teamTasks', team.id] }); toast.success('Task created!'); },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamTasks', team.id] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teamTasks', team.id] }); setSelectedTask(null); toast.success('Task deleted'); },
  });

  // Productivity stats per member
  const memberStats = members.filter(m => m.status === 'active').map(m => ({
    ...m,
    assigned: tasks.filter(t => t.assigned_to === m.user_email).length,
    completed: tasks.filter(t => t.assigned_to === m.user_email && t.status === 'completed').length,
  }));

  const TABS = [
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'productivity', label: 'Productivity', icon: BarChart2 },
  ];

  return (
    <div className="space-y-4">
      <VoiceTaskInput isOpen={showVoice} onClose={() => setShowVoice(false)}
        onTasksCreated={(created) => { created.forEach(t => createTask.mutate({ ...t, team_id: team.id })); setShowVoice(false); }} />

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 55%, #1D6FB8 100%)', border: '1px solid rgba(41,171,226,0.3)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs mb-2 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Teams
        </button>
        <h1 className="text-2xl font-black text-white">{team.name}</h1>
        {team.description && <p className="text-sm text-[#A8C8E8] mt-0.5">{team.description}</p>}
        <div className="flex items-center gap-3 mt-2">
          <Badge className="bg-white/20 text-white border-white/30 text-xs">
            <Users className="w-3 h-3 mr-1" />{members.filter(m => m.status === 'active').length} active
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />{tasks.length} tasks
          </Badge>
          <Badge className={`border-0 text-xs ${ROLE_CONFIG[myRole]?.color}`}>
            {ROLE_CONFIG[myRole]?.label}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${tab === t.id ? 'border-[#1D6FB8] text-[#1D6FB8]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {canEdit(myRole) && (
            <div className="flex gap-2">
              <Button onClick={() => setShowVoice(true)} variant="outline" size="sm"
                className="border-[#29ABE2]/40 text-[#29ABE2] hover:bg-[#29ABE2]/10 gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Voice Add
              </Button>
              <QuickTaskAdd members={members.filter(m => m.status === 'active')} onAdd={data => createTask.mutate(data)} isPending={createTask.isPending} />
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No tasks yet. Add one above!</div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskRow key={task.id} task={task} members={members} myRole={myRole} user={user}
                  onSelect={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                  isSelected={selectedTask?.id === task.id}
                  onStatusChange={(status) => updateTask.mutate({ id: task.id, data: { status } })}
                  onAssign={(email) => updateTask.mutate({ id: task.id, data: { assigned_to: email } })}
                  onDelete={() => deleteTask.mutate(task.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === 'members' && (
        <div className="space-y-4">
          {canManage(myRole) && (
            <Card className="border-[#29ABE2]/20">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#29ABE2]" />Invite Member</CardTitle></CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Input placeholder="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-[180px]" onKeyDown={e => e.key === 'Enter' && inviteMutation.mutate()} />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail.trim() || inviteMutation.isPending} className="bg-[#1D6FB8]">
                  {inviteMutation.isPending ? 'Sending…' : 'Invite'}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {members.map(m => {
              const RoleIcon = ROLE_CONFIG[m.role]?.icon || Users;
              return (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1D6FB8] flex items-center justify-center text-white text-sm font-bold">
                      {(m.user_name || m.user_email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-slate-500">{m.user_email} · {m.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage(myRole) && m.role !== 'owner' ? (
                      <Select value={m.role} onValueChange={role => updateMemberRole.mutate({ id: m.id, role })}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_CONFIG[m.role]?.color + ' text-xs'}>
                        <RoleIcon className="w-3 h-3 mr-1" />{ROLE_CONFIG[m.role]?.label}
                      </Badge>
                    )}
                    {canManage(myRole) && m.role !== 'owner' && m.user_email !== user.email && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember.mutate(m.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRODUCTIVITY TAB */}
      {tab === 'productivity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Tasks', value: tasks.length, color: 'from-[#1D6FB8] to-[#29ABE2]' },
              { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'from-[#0D4F6C] to-[#1B2A4A]' },
              { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'from-[#2980B9] to-[#1D6FB8]' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-xl p-4 shadow`}>
                <p className="text-white/70 text-xs">{s.label}</p>
                <p className="text-3xl font-black mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Member Productivity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {memberStats.length === 0 && <p className="text-sm text-slate-400">No active members yet.</p>}
              {memberStats.map(m => {
                const pct = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.user_name || m.user_email}</span>
                      <span className="text-slate-500 text-xs">{m.completed}/{m.assigned} tasks · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#1D6FB8] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task detail / comments drawer */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl p-5 max-h-[70dvh] overflow-y-auto border-t border-[#29ABE2]/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100">{selectedTask.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge className={PRIORITY_COLORS[selectedTask.priority]}>{selectedTask.priority}</Badge>
                  {selectedTask.due_date && <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{format(new Date(selectedTask.due_date), 'MMM d')}</Badge>}
                  {selectedTask.assigned_to && <Badge variant="outline" className="text-xs">{selectedTask.assigned_to}</Badge>}
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
            </div>
            {selectedTask.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{selectedTask.description}</p>}
            <CommentThread entityType="task" entityId={selectedTask.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Quick Task Add form ──────────────────────────────────────────────────────
function QuickTaskAdd({ members, onAdd, isPending }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignTo, setAssignTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, assigned_to: assignTo || null, due_date: dueDate || null, status: 'todo' });
    setTitle(''); setPriority('medium'); setAssignTo(''); setDueDate('');
    setOpen(false);
  };

  if (!open) return (
    <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-[#1D6FB8] hover:bg-[#2980B9]">
      <Plus className="w-3.5 h-3.5" /> Add Task
    </Button>
  );

  return (
    <div className="flex-1 flex flex-wrap gap-2 items-end p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#29ABE2]/30 shadow-sm">
      <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[160px]" onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
      <Select value={assignTo} onValueChange={setAssignTo}>
        <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Assign to…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Unassigned</SelectItem>
          {members.map(m => <SelectItem key={m.id} value={m.user_email}>{m.user_name || m.user_email}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-36 h-9" />
      <Button size="sm" onClick={submit} disabled={!title.trim() || isPending} className="bg-[#1D6FB8]">Add</Button>
      <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}

// ── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, members, myRole, user, onSelect, isSelected, onStatusChange, onAssign, onDelete }) {
  const canAct = canEdit(myRole);
  const assignedMember = members.find(m => m.user_email === task.assigned_to);
  const overdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date();

  return (
    <div className={`rounded-xl border transition-all ${isSelected ? 'border-[#29ABE2]/50 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-[#29ABE2]/30'} bg-white dark:bg-slate-900`}>
      <div className="flex items-center gap-3 p-3">
        <input type="checkbox" checked={task.status === 'completed'} disabled={!canAct}
          onChange={e => onStatusChange(e.target.checked ? 'completed' : 'todo')}
          className="w-4 h-4 rounded accent-[#1D6FB8] cursor-pointer flex-shrink-0" />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</p>
          <div className="flex gap-1.5 mt-0.5 flex-wrap">
            <Badge className={`text-[10px] py-0 px-1.5 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
                <Clock className="w-2.5 h-2.5" />{format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {assignedMember && <span className="text-[10px] text-slate-400">→ {assignedMember.user_name || assignedMember.user_email}</span>}
          </div>
        </div>
        <button onClick={onSelect} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
          <MessageSquare className={`w-4 h-4 ${isSelected ? 'text-[#29ABE2]' : 'text-slate-400'}`} />
        </button>
        {canManage(myRole) && (
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page Entry Point ─────────────────────────────────────────────────────────
export default function TeamWorkspacePage() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [myRole, setMyRole] = useState('member');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!user) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#1D6FB8] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <AnimatePresence mode="wait">
        {!selectedTeam ? (
          <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TeamList user={user} onSelect={(team, role) => { setSelectedTeam(team); setMyRole(role); }} />
          </motion.div>
        ) : (
          <motion.div key="workspace" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <TeamWorkspaceView team={selectedTeam} myRole={myRole} user={user} onBack={() => setSelectedTeam(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}