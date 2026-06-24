import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Send, Lock, Pin, Megaphone, BookOpen, Compass, Hash, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CHANNEL_DESCRIPTIONS = {
  announcements: 'Official announcements from mosque administration. Only admins can post here.',
  general: 'Open community discussion — say Assalamu Alaikum! 🌙',
  'quran-study': 'Weekly Quran study circle. Share reflections, translations and Tafsir notes.',
  'hajj-group': 'Coordinate your group Hajj & Umrah journey — itineraries, rituals, and tips.',
  youth: 'Youth programme updates, events, and activities.',
  sisters: 'A private, welcoming space for sisters.',
};

function MessageBubble({ msg, isMe }) {
  return (
    <div className={cn('flex gap-2.5 group', isMe ? 'flex-row-reverse' : '')}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">
        {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
      </div>
      <div className={cn('max-w-[72%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
        <div className={cn('flex items-center gap-2 mb-0.5', isMe ? 'flex-row-reverse' : '')}>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isMe ? 'You' : (msg.sender_name || msg.sender_email)}
          </span>
          <span className="text-[10px] text-slate-400">
            {format(new Date(msg.created_date), 'HH:mm')}
          </span>
        </div>
        <div className={cn(
          'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
          isMe
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-tr-sm shadow-sm shadow-amber-300/20'
            : 'bg-white dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-amber-100 dark:border-amber-800/30 shadow-sm'
        )}>
          {msg.message}
        </div>
      </div>
    </div>
  );
}

function AnnouncementBubble({ msg }) {
  return (
    <div className="flex gap-3 my-1">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5">
        📢
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {msg.sender_name || 'Admin'}
          </span>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] px-1.5 py-0">Admin</Badge>
          <span className="text-[10px] text-slate-400">{format(new Date(msg.created_date), 'HH:mm')}</span>
        </div>
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-2xl rounded-tl-sm">
          <p className="text-sm text-amber-900 dark:text-amber-100">{msg.message}</p>
        </div>
      </div>
    </div>
  );
}

export default function MosqueChatPanel({ channel, user }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const chatKey = `mosque_${channel.id}`;

  const { data: allGroups = [] } = useQuery({
    queryKey: ['mosqueGroups'],
    queryFn: () => SDK.entities.GroupChat.filter({ context_type: 'general' })
  });

  const channelGroup = allGroups.find(g => g.name === chatKey);

  const { data: messages = [] } = useQuery({
    queryKey: ['mosqueMessages', channel.id, channelGroup?.id],
    queryFn: () => channelGroup
      ? SDK.entities.GroupMessage.filter({ group_chat_id: channelGroup.id }, '-created_date', 60)
      : [],
    enabled: !!channelGroup,
    refetchInterval: 4000
  });

  const sortedMessages = [...messages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const ensureGroupMutation = useMutation({
    mutationFn: () => SDK.entities.GroupChat.create({
      name: chatKey,
      context_type: 'general',
      members: [user?.email],
      created_by: user?.email
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mosqueGroups'] })
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      let group = channelGroup;
      if (!group) group = await ensureGroupMutation.mutateAsync();
      return SDK.entities.GroupMessage.create({
        group_chat_id: group.id,
        message,
        sender_email: user?.email,
        sender_name: user?.full_name || user?.email,
        message_type: 'text'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mosqueMessages', channel.id] });
      queryClient.invalidateQueries({ queryKey: ['mosqueGroups'] });
      setMessage('');
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || channel.adminOnly) return;
    sendMutation.mutate();
  };

  const isAnnouncementChannel = channel.type === 'announcement';
  const desc = CHANNEL_DESCRIPTIONS[channel.id];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
      {/* Channel header */}
      <div className="px-5 py-3.5 border-b border-amber-100 dark:border-amber-800/30 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <span className="text-xl">{channel.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{channel.name}</h3>
            {channel.adminOnly && (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 gap-1 px-1.5">
                <Lock className="w-2.5 h-2.5" /> Admin-only
              </Badge>
            )}
            {channel.type === 'study' && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Study Circle</Badge>}
            {channel.type === 'hajj' && <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-0">Hajj Group</Badge>}
          </div>
          {desc && <p className="text-[11px] text-slate-400 truncate">{desc}</p>}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-12">
            <span className="text-5xl">{channel.icon}</span>
            <div className="text-center">
              <p className="font-semibold text-slate-600 dark:text-slate-400">{channel.name}</p>
              <p className="text-xs mt-1 max-w-xs leading-relaxed">
                {channel.adminOnly
                  ? 'Admins will post important announcements here. Check back soon.'
                  : `Be the first to post in ${channel.name}! 🌙`}
              </p>
            </div>
          </div>
        ) : (
          sortedMessages.map(msg =>
            channel.type === 'announcement'
              ? <AnnouncementBubble key={msg.id} msg={msg} />
              : <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_email === user?.email} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {channel.adminOnly ? (
        <div className="px-5 py-4 border-t border-amber-100 dark:border-amber-800/30 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Read-only — only mosque admins can post announcements
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-amber-100 dark:border-amber-800/30 flex gap-2">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Message #${channel.name}…`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-gradient-to-br from-amber-500 to-orange-500 hover:opacity-90 rounded-xl w-11 h-11 flex-shrink-0 shadow-md shadow-amber-300/20"
            disabled={!message.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}