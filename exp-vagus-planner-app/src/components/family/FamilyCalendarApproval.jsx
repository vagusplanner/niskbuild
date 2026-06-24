import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Calendar, Plus, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const EVENT_TYPES = ['family','school','appointment','birthday','holiday','other'];

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'text-teal-400',   bg: 'bg-teal-400/10 border-teal-400/25',   icon: CheckCircle2 },
  pending:  { label: 'Pending',  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/25', icon: Clock },
  rejected: { label: 'Rejected', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/25',     icon: XCircle },
};

export default function FamilyCalendarApproval({ groupId, user, isAdmin, memberEmails = [], memberNames = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('all'); // all | pending | approved
  const [form, setForm] = useState({ title: '', event_date: '', type: 'family', start_time: '', description: '' });
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['familyEvents', groupId],
    queryFn: () => SDK.entities.FamilyCalendarEvent.filter({ family_group_id: groupId }, '-event_date', 50),
    enabled: !!groupId,
  });

  const createEvent = useMutation({
    mutationFn: (data) => SDK.entities.FamilyCalendarEvent.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(['familyEvents', groupId]);
      // Notify everyone
      SDK.entities.FamilyNotification.create({
        family_group_id: groupId,
        type: 'event_proposed',
        actor_email: user.email,
        actor_name: user.full_name,
        message: `${user.full_name} proposed a new event: "${form.title}" on ${form.event_date}`,
        entity_id: created?.id || '',
        entity_type: 'FamilyCalendarEvent',
        is_read_by: [user.email],
      }).then(() => qc.invalidateQueries(['familyNotifications', groupId])).catch(() => {});
      setForm({ title: '', event_date: '', type: 'family', start_time: '', description: '' });
      setShowForm(false);
      toast.success(isAdmin ? 'Event added!' : 'Event proposed — awaiting approval');
    },
  });

  const respondEvent = useMutation({
    mutationFn: ({ id, decision, event }) => {
      const newApprovals = [...(event.approvals || []).filter(a => a.member_email !== user.email), {
        member_email: user.email,
        member_name: user.full_name,
        decision,
        decided_at: new Date().toISOString(),
      }];
      const allApproved = newApprovals.filter(a => a.decision === 'approved').length >= Math.ceil((memberEmails.length - 1) / 2);
      const anyRejected = newApprovals.some(a => a.decision === 'rejected');
      const newStatus = isAdmin ? decision : (anyRejected ? 'rejected' : allApproved ? 'approved' : 'pending');
      return SDK.entities.FamilyCalendarEvent.update(id, { approvals: newApprovals, approval_status: newStatus });
    },
    onSuccess: (_, { decision, event }) => {
      qc.invalidateQueries(['familyEvents', groupId]);
      const notifType = decision === 'approved' ? 'event_approved' : 'event_rejected';
      const emoji = decision === 'approved' ? '✅' : '❌';
      SDK.entities.FamilyNotification.create({
        family_group_id: groupId,
        type: notifType,
        actor_email: user.email,
        actor_name: user.full_name,
        target_email: event.owner_email,
        message: `${user.full_name} ${decision} the event "${event.title}"`,
        entity_id: event.id,
        entity_type: 'FamilyCalendarEvent',
        is_read_by: [user.email],
      }).then(() => qc.invalidateQueries(['familyNotifications', groupId])).catch(() => {});
      toast.success(`Event ${decision}!`);
    },
  });

  const handleAdd = () => {
    if (!form.title.trim() || !form.event_date) return;
    createEvent.mutate({
      ...form,
      family_group_id: groupId,
      owner_email: user.email,
      owner_name: user.full_name,
      approval_status: isAdmin ? 'approved' : 'pending',
      approvals: [],
    });
  };

  const filtered = events.filter(e => {
    if (tab === 'pending') return e.approval_status === 'pending';
    if (tab === 'approved') return e.approval_status === 'approved';
    return true;
  });

  const pendingCount = events.filter(e => e.approval_status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setShowForm(s => !s)} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1 h-9">
          <Plus className="w-3.5 h-3.5" /> Propose Event
        </Button>
        <div className="ml-auto flex items-center bg-white/5 border border-white/10 rounded-2xl p-0.5 gap-0.5">
          {[['all','All'], ['pending', `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`], ['approved','Approved']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === k ? 'bg-amber-400 text-[#071224]' : 'text-white/40 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white/[0.04] border border-white/15 rounded-3xl p-4 space-y-3">
            {!isAdmin && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-400/8 border border-amber-400/15 rounded-xl text-xs text-amber-300">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                This event will be sent for admin approval before appearing on the shared calendar.
              </div>
            )}
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title…" className="bg-white/5 border-white/20 text-white placeholder:text-white/30" />
            <div className="flex gap-2">
              <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                className="bg-white/5 border-white/15 text-white flex-1" />
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="bg-white/5 border-white/15 text-white w-32" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
                {EVENT_TYPES.map(t => <option key={t} value={t} className="bg-[#071224]">{t}</option>)}
              </select>
            </div>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)" className="bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm" />
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1 border-white/15 text-white/50 bg-transparent">Cancel</Button>
              <Button onClick={handleAdd} size="sm" disabled={createEvent.isPending} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold">
                {isAdmin ? 'Add Event' : 'Propose Event'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events list */}
      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/8 rounded-3xl">
          <Calendar className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No events here yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(event => {
            const cfg = STATUS_CONFIG[event.approval_status || 'approved'];
            const StatusIcon = cfg.icon;
            const myApproval = event.approvals?.find(a => a.member_email === user.email);
            const canRespond = isAdmin && event.approval_status === 'pending' && event.owner_email !== user.email && !myApproval;

            return (
              <motion.div key={event.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`p-3.5 rounded-2xl border transition-all ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
                      <p className="text-sm font-black text-white truncate">{event.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/40 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />
                        {event.event_date ? format(new Date(event.event_date), 'EEE d MMM') : 'No date'}
                        {event.start_time && ` · ${event.start_time}`}
                      </span>
                      <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{event.owner_name}</span>
                      <span className={`font-black ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    {event.approvals?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {event.approvals.map(a => (
                          <span key={a.member_email} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${a.decision === 'approved' ? 'bg-teal-400/10 text-teal-400 border-teal-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                            {a.member_name?.split(' ')[0]} {a.decision === 'approved' ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canRespond && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" onClick={() => respondEvent.mutate({ id: event.id, decision: 'approved', event })}
                        className="h-8 px-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-400/20 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" onClick={() => respondEvent.mutate({ id: event.id, decision: 'rejected', event })}
                        className="h-8 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-400/20 text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}