import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function UserSearchModal({ open, onOpenChange, currentUser, onStartChat }) {
  const [search, setSearch] = useState('');

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users-search'],
    queryFn: () => base44.entities.User.list(),
    enabled: open
  });

  const filtered = allUsers.filter(u =>
    u.email !== currentUser?.email &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (user) => {
    const emails = [currentUser.email, user.email].sort();
    const convId = `${emails[0]}_${emails[1]}`;
    onStartChat({
      id: convId,
      type: 'direct',
      name: user.full_name || user.email.split('@')[0],
      email: user.email
    });
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-teal-600" />
            Find a Vagus Planner User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="text-center py-6 text-slate-400 text-sm">Loading users…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                {search ? 'No users found' : 'Start typing to search'}
              </div>
            ) : (
              filtered.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{user.full_name || user.email.split('@')[0]}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}