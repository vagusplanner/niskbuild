/**
 * FamilyGroupChat — embedded chat panel for the Family Hub.
 * Auto-creates a GroupChat linked to the family group on first use.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Users, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';

function avatarColor(name = '') {
  const colors = ['from-teal-400 to-emerald-500', 'from-purple-400 to-indigo-500', 'from-rose-400 to-pink-500', 'from-amber-400 to-orange-500', 'from-sky-400 to-blue-500'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

export default function FamilyGroupChat({ group, user }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Find or track the family group chat
  const { data: groupChat, isLoading: chatLoading } = useQuery({
    queryKey: ['familyGroupChat', group.id],
    queryFn: async () => {
      const all = await SDK.entities.GroupChat.list('-created_date');
      return all.find(c => c.context_type === 'general' && c.context_id === group.id) || null;
    },
  });

  const createChat = useMutation({
    mutationFn: () => SDK.entities.GroupChat.create({
      name: `${group.name} · Family Chat`,
      context_type: 'general',
      context_id: group.id,
      members: group.member_emails || [],
      created_by: user.email,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familyGroupChat', group.id] }),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['familyMessages', groupChat?.id],
    queryFn: () => SDK.entities.GroupMessage.filter({ group_chat_id: groupChat.id }, 'created_date', 100),
    enabled: !!groupChat?.id,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (text) => SDK.entities.GroupMessage.create({
      group_chat_id: groupChat.id,
      message: text,
      sender_email: user.email,
      sender_name: user.full_name || user.email.split('@')[0],
      message_type: 'text',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMessages', groupChat?.id] });
      setMessage('');
      setAiDraft('');
    },
    onError: () => toast.error('Failed to send'),
  });

  const handleSend = () => {
    const text = message.trim();
    if (!text || !groupChat) return;
    sendMutation.mutate(text);
  };

  const generateAIDraft = async () => {
    if (!messages.length) return;
    setAiLoading(true);
    try {
      const recent = messages.slice(-6).map(m => `${m.sender_name}: ${m.message}`).join('\n');
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are helping a family coordinate their faith life. Based on this family chat conversation, suggest a helpful, warm reply (max 30 words):\n\n${recent}\n\nSuggest one reply as the current user (${user.full_name || user.email.split('@')[0]}):`,
        response_json_schema: { type: 'object', properties: { reply: { type: 'string' } } }
      });
      setAiDraft(res.reply || '');
    } catch (_) {
      toast.error('Could not generate draft');
    }
    setAiLoading(false);
  };

  if (chatLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /></div>;
  }

  if (!groupChat) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-teal-500" />
        </div>
        <div>
          <p className="font-bold text-slate-700 dark:text-slate-200">Start your family chat</p>
          <p className="text-sm text-slate-500 mt-1">Coordinate prayers, Hajj savings, and faith goals together</p>
        </div>
        <Button onClick={() => createChat.mutate()} disabled={createChat.isPending}
          className="bg-teal-600 hover:bg-teal-700">
          {createChat.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
          Start Family Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[480px]">
      {/* Context banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/40 rounded-t-xl">
        <Users className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
        <p className="text-xs text-teal-700 dark:text-teal-300 font-medium flex-1 truncate">
          {group.name} · {group.member_emails?.length || 0} members
        </p>
        <span className="text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-600 px-2 py-0.5 rounded-full font-medium">Family Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900/60 dark:to-slate-900">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-slate-400">No messages yet — say Salaam! 👋</p>
          </div>
        ) : messages.map(msg => {
          const isOwn = msg.sender_email === user.email;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
              <div className={cn('w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0', avatarColor(msg.sender_name || msg.sender_email))}>
                {(msg.sender_name || msg.sender_email).charAt(0).toUpperCase()}
              </div>
              <div className={cn('max-w-[75%]', isOwn && 'items-end flex flex-col')}>
                {!isOwn && <p className="text-[10px] text-slate-400 mb-0.5 ml-1">{msg.sender_name || msg.sender_email.split('@')[0]}</p>}
                <div className={cn('px-3 py-2 rounded-2xl text-sm', isOwn ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm rounded-tl-sm border border-slate-100 dark:border-slate-700')}>
                  {msg.message}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 mx-1">
                  {format(new Date(msg.created_date), isToday(new Date(msg.created_date)) ? 'HH:mm' : 'MMM d, HH:mm')}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Draft suggestion */}
      <AnimatePresence>
        {aiDraft && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <button onClick={() => setMessage(aiDraft)} className="text-xs text-amber-700 dark:text-amber-300 flex-1 text-left hover:underline truncate">
              {aiDraft}
            </button>
            <button onClick={() => setAiDraft('')}><X className="w-3.5 h-3.5 text-amber-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-end rounded-b-xl">
        <button onClick={generateAIDraft} disabled={aiLoading || !messages.length}
          className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 transition-colors flex-shrink-0"
          title="AI draft reply">
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </button>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Message your family..."
          className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400 text-slate-800 dark:text-slate-100 placeholder-slate-400"
        />
        <button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}
          className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors flex-shrink-0 disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}