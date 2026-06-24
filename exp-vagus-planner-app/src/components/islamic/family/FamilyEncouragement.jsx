import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Send, Heart, Star, MessageCircle, Sparkles, Smile } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PRAYERS } from '../FamilyPrayerHub';

const QUICK_MESSAGES = [
  { emoji: '🌟', text: 'MashaAllah! Keep it up!' },
  { emoji: '🤲', text: 'May Allah accept your prayers 🙏' },
  { emoji: '💪', text: 'You can do it! Don\'t miss Fajr!' },
  { emoji: '🌙', text: 'Ramadan Mubarak! Pray together!' },
  { emoji: '❤️', text: 'So proud of you today!' },
  { emoji: '🕋', text: 'Let\'s pray together soon!' },
];

export default function FamilyEncouragement({ familyMembers, memberScore, user }) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState(null);
  const [customMessage, setCustomMessage] = useState('');

  // Use GroupMessage on a shared family channel
  const FAMILY_CHAT_KEY = `family_hub_${[...familyMembers.map(m => m.email)].sort().join('_').slice(0, 60)}`;

  const { data: allGroups = [] } = useQuery({
    queryKey: ['familyEncouragementGroups'],
    queryFn: () => SDK.entities.GroupChat.filter({ context_type: 'general' })
  });

  const familyGroup = allGroups.find(g => g.name === FAMILY_CHAT_KEY);

  const { data: messages = [] } = useQuery({
    queryKey: ['familyEncouragementMessages', familyGroup?.id],
    queryFn: () => familyGroup
      ? SDK.entities.GroupMessage.filter({ group_chat_id: familyGroup.id }, '-created_date', 30)
      : [],
    enabled: !!familyGroup,
    refetchInterval: 6000
  });

  const ensureGroupMutation = useMutation({
    mutationFn: () => SDK.entities.GroupChat.create({
      name: FAMILY_CHAT_KEY,
      context_type: 'general',
      members: familyMembers.map(m => m.email),
      created_by: user?.email
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familyEncouragementGroups'] })
  });

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      let group = familyGroup;
      if (!group) {
        group = await ensureGroupMutation.mutateAsync();
        // Wait briefly for invalidation
        await new Promise(r => setTimeout(r, 300));
      }
      return SDK.entities.GroupMessage.create({
        group_chat_id: group?.id || familyGroup?.id,
        message: text,
        sender_email: user?.email,
        sender_name: user?.full_name || user?.email,
        message_type: 'text'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyEncouragementMessages'] });
      queryClient.invalidateQueries({ queryKey: ['familyEncouragementGroups'] });
      setCustomMessage('');
      setSelectedMember(null);
    }
  });

  const handleSend = (text) => {
    if (!text?.trim()) return;
    const prefix = selectedMember ? `@${selectedMember.name}: ` : '';
    sendMutation.mutate(prefix + text);
  };

  const sortedMessages = [...messages].reverse();

  return (
    <div className="space-y-4">
      {/* Who to encourage */}
      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-400" /> Send to…
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedMember(null)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              !selectedMember
                ? 'bg-rose-500 text-white border-rose-500'
                : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
            )}
          >
            Everyone
          </button>
          {familyMembers.filter(m => !m.isMe).map(member => {
            const score = memberScore(member.email);
            return (
              <button
                key={member.email}
                onClick={() => setSelectedMember(member)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  selectedMember?.email === member.email
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                )}
              >
                <span>{member.name?.[0]?.toUpperCase()}</span>
                <span>{member.name.split(' ')[0]}</span>
                <span className={cn('ml-0.5 text-[9px]', score === 5 ? 'text-emerald-400' : 'text-amber-400')}>
                  {score}/5
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick-send messages */}
      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick messages
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_MESSAGES.map(m => (
            <button
              key={m.text}
              onClick={() => handleSend(m.text)}
              disabled={sendMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-800 transition-all text-left"
            >
              <span className="text-base flex-shrink-0">{m.emoji}</span>
              <span>{m.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div className="flex gap-2">
        <input
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend(customMessage)}
          placeholder={selectedMember ? `Write to ${selectedMember.name}…` : 'Write a message to everyone…'}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
        <Button
          size="icon"
          className="bg-rose-500 hover:bg-rose-600 rounded-xl h-10 w-10 flex-shrink-0"
          onClick={() => handleSend(customMessage)}
          disabled={!customMessage.trim() || sendMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Message feed */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No messages yet — send the first encouragement! 💌</p>
          </div>
        ) : (
          sortedMessages.map(msg => {
            const isMe = msg.sender_email === user?.email;
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : '')}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
                </div>
                <div className={cn('max-w-[75%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'px-3 py-2 rounded-2xl text-xs leading-relaxed',
                    isMe
                      ? 'bg-rose-500 text-white rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                  )}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                    {isMe ? 'You' : msg.sender_name} · {format(new Date(msg.created_date), 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}