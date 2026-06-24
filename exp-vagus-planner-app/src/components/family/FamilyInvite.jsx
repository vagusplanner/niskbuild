import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Copy, RefreshCw, Users, Crown, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function FamilyInvite({ group, user, onGroupUpdate }) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const qc = useQueryClient();

  const isAdmin = group?.admin_email === user?.email;
  const members = group?.member_emails || [];

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return toast.error('Enter a family name');
    setCreatingGroup(true);
    try {
      const code = generateInviteCode();
      await SDK.entities.FamilyGroup.create({
        name: groupName.trim(),
        admin_email: user.email,
        invite_code: code,
        member_emails: [user.email],
        member_names: [user.full_name || user.email],
      });
      qc.invalidateQueries(['familyGroup']);
      toast.success(`Family group "${groupName}" created!`);
      setGroupName('');
    } catch (_) { toast.error('Failed to create group'); }
    setCreatingGroup(false);
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    if (!email.includes('@')) return toast.error('Invalid email');
    if (members.includes(email.trim())) return toast.warning('Already a member');
    setInviting(true);
    try {
      await SDK.integrations.Core.SendEmail({
        to: email.trim(),
        subject: `${user.full_name || 'Your family'} has invited you to the ${group.name} family on Vagus Planner`,
        body: `Assalamu Alaikum!\n\n${user.full_name || user.email} has invited you to join their family group "${group.name}" on Vagus Planner.\n\nJoin code: ${group.invite_code}\n\nVisit the Family Dashboard and use the code above to join.\n\nJazakAllah Khair,\nVagus Planner Team`,
      });
      // Also add them as pending
      const updatedEmails = [...members, email.trim()];
      const updatedNames = [...(group.member_names || []), email.trim()];
      await SDK.entities.FamilyGroup.update(group.id, {
        member_emails: updatedEmails,
        member_names: updatedNames,
      });
      qc.invalidateQueries(['familyGroup']);
      toast.success(`Invite sent to ${email}!`);
      setEmail('');
    } catch (_) { toast.error('Failed to send invite'); }
    setInviting(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const groups = await SDK.entities.FamilyGroup.filter({ invite_code: joinCode.trim().toUpperCase() });
      if (!groups.length) { toast.error('Invalid code'); setJoining(false); return; }
      const g = groups[0];
      if ((g.member_emails || []).includes(user.email)) { toast.warning('Already a member'); setJoining(false); return; }
      await SDK.entities.FamilyGroup.update(g.id, {
        member_emails: [...(g.member_emails || []), user.email],
        member_names: [...(g.member_names || []), user.full_name || user.email],
      });
      qc.invalidateQueries(['familyGroup']);
      toast.success(`Joined "${g.name}"!`);
      setJoinCode('');
    } catch (_) { toast.error('Failed to join'); }
    setJoining(false);
  };

  const handleRemoveMember = async (memberEmail) => {
    if (!isAdmin || memberEmail === user.email) return;
    const updatedEmails = members.filter(e => e !== memberEmail);
    const updatedNames = (group.member_names || []).filter((_, i) => group.member_emails[i] !== memberEmail);
    await SDK.entities.FamilyGroup.update(group.id, { member_emails: updatedEmails, member_names: updatedNames });
    qc.invalidateQueries(['familyGroup']);
    toast.success('Member removed');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(group?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!group) {
    return (
      <div className="space-y-5">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-black text-white text-base flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Create a Family Group</h3>
          <div className="flex gap-2">
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. The Ahmed Family"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30" onKeyDown={e => e.key === 'Enter' && handleCreateGroup()} />
            <Button onClick={handleCreateGroup} disabled={creatingGroup} className="bg-amber-400 text-[#071224] font-bold flex-shrink-0">
              {creatingGroup ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-black text-white text-base flex items-center gap-2"><UserPlus className="w-4 h-4 text-teal-400" /> Join with Invite Code</h3>
          <div className="flex gap-2">
            <Input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="6-letter code e.g. ABC123"
              maxLength={6} className="bg-white/5 border-white/20 text-white placeholder:text-white/30 tracking-widest font-mono" />
            <Button onClick={handleJoin} disabled={joining} className="bg-teal-500 text-white font-bold flex-shrink-0">
              {joining ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Join'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Invite code */}
      <div className="bg-amber-400/8 border border-amber-400/20 rounded-3xl p-5">
        <p className="text-xs text-amber-400/70 font-bold uppercase tracking-widest mb-3">Family Invite Code</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#071224] border border-amber-400/30 rounded-2xl px-5 py-3 font-mono text-2xl font-black text-amber-300 tracking-[0.3em] text-center">
            {group.invite_code}
          </div>
          <button onClick={copyCode} className="p-3 bg-amber-400/15 hover:bg-amber-400/25 rounded-2xl border border-amber-400/20 transition-all">
            {copied ? <Check className="w-5 h-5 text-amber-400" /> : <Copy className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
        <p className="text-xs text-white/40 mt-2 text-center">Share this code with family members so they can join</p>
      </div>

      {/* Invite by email */}
      {isAdmin && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> Invite by Email</h3>
          <div className="flex gap-2">
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="family@email.com" type="email"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30" onKeyDown={e => e.key === 'Enter' && handleInvite()} />
            <Button onClick={handleInvite} disabled={inviting} className="bg-blue-500 text-white font-bold flex-shrink-0 gap-1">
              {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Invite</>}
            </Button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><Users className="w-4 h-4 text-teal-400" /> Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((memberEmail, i) => {
            const name = group.member_names?.[i] || memberEmail;
            const isOwner = memberEmail === group.admin_email;
            return (
              <div key={memberEmail} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {(name[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{name}</p>
                  <p className="text-xs text-white/40 truncate">{memberEmail}</p>
                </div>
                {isOwner && <span className="text-[9px] font-black bg-amber-400/15 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full flex-shrink-0">Admin</span>}
                {isAdmin && !isOwner && (
                  <button onClick={() => handleRemoveMember(memberEmail)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}