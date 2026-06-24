import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Hash, Lock, Megaphone, BookOpen, Compass, Users, Plus, X, Shield, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const DEFAULT_CHANNELS = [
  { id: 'announcements', name: 'Announcements', icon: '📢', type: 'announcement', description: 'Official mosque announcements', adminOnly: true },
  { id: 'general',       name: 'General',       icon: '💬', type: 'text',         description: 'Community discussions' },
  { id: 'quran-study',   name: 'Quran Study Circle', icon: '📖', type: 'study',  description: 'Weekly Quran study & Tafsir' },
  { id: 'hajj-group',    name: 'Hajj Coordination',  icon: '🕋', type: 'hajj',   description: 'Group Hajj & Umrah planning' },
  { id: 'youth',         name: 'Youth Programme',    icon: '⭐', type: 'text',    description: 'Youth activities & events' },
  { id: 'sisters',       name: "Sisters' Circle",    icon: '🌸', type: 'text',    description: 'Private sisters\' space' },
];

const TYPE_ICON = {
  announcement: Megaphone,
  study: BookOpen,
  hajj: Compass,
  text: Hash,
};

export default function MosqueChannelSidebar({ selectedChannel, onSelect, user, customChannels = [], onChannelsChange }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const allChannels = [...DEFAULT_CHANNELS, ...customChannels];

  const addChannelMutation = useMutation({
    mutationFn: () => SDK.entities.GroupChat.create({
      name: `mosque_custom_${newName.toLowerCase().replace(/\s+/g, '-')}`,
      context_type: 'general',
      members: [user?.email],
      created_by: user?.email
    }),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['mosqueGroups'] });
      const custom = { id: group.id, name: newName, icon: '💬', type: 'text', custom: true, groupId: group.id };
      if (onChannelsChange) onChannelsChange(custom);
      setNewName('');
      setShowAdd(false);
    }
  });

  const channelGroups = [
    { label: 'Core Channels', channels: DEFAULT_CHANNELS },
    ...(customChannels.length > 0 ? [{ label: 'Custom Channels', channels: customChannels }] : []),
  ];

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-amber-200 dark:border-amber-800/40 bg-gradient-to-b from-amber-50 to-orange-50/30 dark:from-amber-950/30 dark:to-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-amber-200 dark:border-amber-800/40">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-amber-300/30">
            🕌
          </div>
          <div>
            <p className="font-black text-sm text-amber-900 dark:text-amber-100">Community Hub</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Private & Encrypted</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 text-[10px] gap-1">
            <Shield className="w-2.5 h-2.5" /> Enterprise Islamic
          </Badge>
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {channelGroups.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/70 dark:text-amber-500/60 px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.channels.map(ch => {
                const TypeIcon = TYPE_ICON[ch.type] || Hash;
                const isActive = selectedChannel?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelect(ch)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all text-xs group',
                      isActive
                        ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-semibold shadow-sm'
                        : 'text-amber-800/80 dark:text-amber-300/70 hover:bg-amber-100/80 dark:hover:bg-amber-900/30'
                    )}
                  >
                    <span className="text-sm flex-shrink-0">{ch.icon}</span>
                    <span className="truncate flex-1">{ch.name}</span>
                    {ch.adminOnly && (
                      <Lock className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add channel */}
      <div className="p-2 border-t border-amber-200 dark:border-amber-800/40">
        {showAdd ? (
          <div className="space-y-1.5">
            <Input
              autoFocus
              placeholder="Channel name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newName.trim() && addChannelMutation.mutate()}
              className="h-7 text-xs border-amber-300 dark:border-amber-700"
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1 h-7 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => addChannelMutation.mutate()} disabled={!newName.trim()}>
                Create
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowAdd(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Channel
          </button>
        )}

        {/* User badge */}
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-amber-100/50 dark:bg-amber-900/20">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate flex-1">{user?.full_name || user?.email}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}