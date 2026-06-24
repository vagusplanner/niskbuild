/**
 * FamilySetup — create a new family group or join an existing one via invite code.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Hash, Plus, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GA } from '@/lib/ga4';
import { cn } from '@/lib/utils';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function FamilySetup({ user, onDone }) {
  const [tab, setTab] = useState('create');
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      base44.entities.FamilyGroup.create({
        name: familyName.trim(),
        invite_code: generateCode(),
        admin_email: user.email,
        member_emails: [user.email],
        member_names: [user.full_name || user.email],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyGroup'] });
      GA.familyCreated();
      toast.success('Family group created!');
      onDone();
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const groups = await base44.entities.FamilyGroup.filter({ invite_code: joinCode.trim().toUpperCase() });
      if (!groups.length) throw new Error('Invite code not found');
      const group = groups[0];
      if (group.member_emails?.includes(user.email)) throw new Error('You are already in this family');
      return base44.entities.FamilyGroup.update(group.id, {
        member_emails: [...(group.member_emails || []), user.email],
        member_names: [...(group.member_names || []), user.full_name || user.email],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyGroup'] });
      GA.familyJoined();
      toast.success('Joined family group!');
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="max-w-sm mx-auto space-y-6 py-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Family Hub</h2>
        <p className="text-sm text-slate-500 mt-1">Connect your family for shared prayer goals, Hajj planning & Zakat tracking</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {[['create', 'Create Family'], ['join', 'Join Family']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
              tab === id ? 'bg-white dark:bg-slate-700 shadow text-teal-700 dark:text-teal-300' : 'text-slate-500'
            )}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <div className="space-y-4">
          <div>
            <Label>Family Name</Label>
            <Input className="mt-1" placeholder="e.g. The Ahmed Family" value={familyName}
              onChange={e => setFamilyName(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!familyName.trim() || createMutation.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold h-11">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Create Family</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label>Invite Code</Label>
            <Input className="mt-1 font-mono uppercase tracking-widest text-center text-lg"
              placeholder="ABC123" maxLength={6} value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())} />
            <p className="text-xs text-slate-400 mt-1 text-center">Ask your family admin for the 6-character code</p>
          </div>
          <Button onClick={() => joinMutation.mutate()} disabled={joinCode.length < 6 || joinMutation.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold h-11">
            {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-1" />Join Family</>}
          </Button>
        </div>
      )}
    </div>
  );
}