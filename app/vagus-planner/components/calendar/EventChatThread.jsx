import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, Sparkles, Calendar, CheckSquare, Users, 
  Loader2, Download, Copy, Plus, AtSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function EventChatThread({ event, onCreateMeeting, onCreateTask }) {
  const [message, setMessage] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const conversationId = `event_${event.id}`;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['eventChat', conversationId],
    queryFn: () => base44.entities.Chat.filter({ conversation_id: conversationId }, 'created_date')
  });

  // Get potential mention users from messages
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const potentialMentions = allUsers.filter(u => 
    u.email !== user?.email &&
    (u.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(mentionSearch.toLowerCase()))
  ).slice(0, 5);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Chat.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventChat', conversationId] });
      setMessage('');
      scrollToBottom();
    }
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;

    // Extract mentions from message
    const mentionedEmails = [...message.matchAll(/@(\S+)/g)].map(m => m[1]);

    sendMessageMutation.mutate({
      conversation_id: conversationId,
      message: message.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email
    });

    // Send notifications for mentions
    if (mentionedEmails.length > 0) {
      mentionedEmails.forEach(email => {
        base44.functions.invoke('sendNotification', {
          to_email: email,
          title: `${user.full_name || user.email} mentioned you`,
          body: `In ${event.title}: ${message.trim()}`,
          type: 'mention',
          link: `/Calendar?event=${event.id}`
        }).catch(console.error);
      });
    }
  };

  const handleMentionSelect = (mentionUser) => {
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const beforeCursor = message.substring(0, cursorPos);
    const afterCursor = message.substring(cursorPos);
    
    // Find the @ symbol position
    const atIndex = beforeCursor.lastIndexOf('@');
    const newMessage = 
      beforeCursor.substring(0, atIndex) + 
      `@${mentionUser.email} ` + 
      afterCursor;
    
    setMessage(newMessage);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const handleAISuggest = async () => {
    if (messages.length === 0) {
      toast.error('No conversation to analyze');
      return;
    }

    setAiSuggesting(true);
    toast.loading('AI analyzing conversation...', { id: 'ai-suggest' });

    try {
      const result = await base44.functions.invoke('analyzeChatForActions', {
        conversation_id: conversationId,
        event_title: event.title,
        messages: messages.map(m => ({
          sender: m.sender_name,
          text: m.message,
          timestamp: m.created_date
        }))
      });

      const suggestions = result.data?.suggestions || [];
      
      if (suggestions.length === 0) {
        toast.info('No actionable items found', { id: 'ai-suggest' });
      } else {
        toast.success(`Found ${suggestions.length} suggestions!`, { id: 'ai-suggest' });
        
        // Auto-send AI suggestions as a message
        sendMessageMutation.mutate({
          conversation_id: conversationId,
          message: `🤖 AI Suggestions:\n${suggestions.map((s, i) => `${i + 1}. ${s.type}: ${s.description}`).join('\n')}`,
          sender_email: 'ai@assistant',
          sender_name: 'AI Assistant'
        });
      }
    } catch (error) {
      toast.error('Failed to analyze conversation', { id: 'ai-suggest' });
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleExportTranscript = () => {
    const transcript = messages.map(m => 
      `[${format(new Date(m.created_date), 'MMM d, h:mm a')}] ${m.sender_name}: ${m.message}`
    ).join('\n\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-chat-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded!');
  };

  const handleCopyTranscript = () => {
    const transcript = messages.map(m => 
      `[${format(new Date(m.created_date), 'MMM d, h:mm a')}] ${m.sender_name}: ${m.message}`
    ).join('\n\n');

    navigator.clipboard.writeText(transcript);
    toast.success('Transcript copied to clipboard!');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Event Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyTranscript} disabled={messages.length === 0}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportTranscript} disabled={messages.length === 0}>
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAISuggest}
              disabled={aiSuggesting || messages.length === 0}
            >
              {aiSuggesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Suggest
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start chatting about this event!</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = msg.sender_email === user?.email;
              const isAI = msg.sender_email === 'ai@assistant';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className={isAI ? 'bg-purple-100 text-purple-600' : 'bg-teal-100 text-teal-600'}>
                      {isAI ? '🤖' : msg.sender_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <p className="text-xs text-slate-500 mb-1">
                      {msg.sender_name} • {format(new Date(msg.created_date), 'h:mm a')}
                    </p>
                    <div className={`rounded-2xl px-4 py-2 ${
                      isAI ? 'bg-purple-50 border border-purple-200' :
                      isMe ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.message.split(/(@\S+)/).map((part, i) => {
                          if (part.startsWith('@')) {
                            const mentionedEmail = part.substring(1);
                            const isMentioningMe = mentionedEmail === user?.email;
                            return (
                              <span
                                key={i}
                                className={cn(
                                  "font-semibold px-1 rounded",
                                  isMentioningMe 
                                    ? "bg-yellow-200 text-yellow-900" 
                                    : isMe ? "bg-teal-500" : "bg-teal-100 text-teal-700"
                                )}
                              >
                                {part}
                              </span>
                            );
                          }
                          return part;
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                value={message}
                onChange={handleMessageChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message... (use @ to mention)"
                className="pr-10"
              />
              <Popover open={showMentions} onOpenChange={setShowMentions}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => {
                      setMessage(message + '@');
                      setShowMentions(true);
                      inputRef.current?.focus();
                    }}
                  >
                    <AtSign className="w-4 h-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-64 p-2" 
                  align="start" 
                  side="top"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 px-2 py-1">Mention someone</p>
                    {potentialMentions.length === 0 ? (
                      <p className="text-xs text-slate-400 px-2 py-2">No users found</p>
                    ) : (
                      potentialMentions.map((mentionUser) => (
                        <button
                          key={mentionUser.email}
                          onClick={() => handleMentionSelect(mentionUser)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-teal-600">
                                {mentionUser.full_name?.charAt(0) || mentionUser.email.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{mentionUser.full_name || mentionUser.email}</p>
                              <p className="text-xs text-slate-500 truncate">{mentionUser.email}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleSend} disabled={!message.trim() || sendMessageMutation.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessage('/schedule follow-up meeting ');
            }}
            className="text-xs"
          >
            <Calendar className="w-3 h-3 mr-1" />
            Schedule Meeting
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessage('/create task ');
            }}
            className="text-xs"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            Create Task
          </Button>
        </div>
      </div>
    </Card>
  );
}