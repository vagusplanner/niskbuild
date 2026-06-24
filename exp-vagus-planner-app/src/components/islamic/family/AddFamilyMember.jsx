import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, UserPlus } from 'lucide-react';

export default function AddFamilyMember({ onAdded }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const addMutation = useMutation({
    mutationFn: () => SDK.entities.SocialConnection.create({
      friend_name: name.trim(),
      connected_user_email: name.trim(),
      status: 'family'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      setName('');
      setOpen(false);
      if (onAdded) onAdded();
    }
  });

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs h-8"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="w-3.5 h-3.5" /> Add Member
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="Name or email…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && addMutation.mutate()}
        className="h-8 text-xs w-44"
      />
      <Button
        size="sm"
        className="h-8 bg-rose-500 hover:bg-rose-600 px-3 text-xs"
        onClick={() => addMutation.mutate()}
        disabled={!name.trim() || addMutation.isPending}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setOpen(false)}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}