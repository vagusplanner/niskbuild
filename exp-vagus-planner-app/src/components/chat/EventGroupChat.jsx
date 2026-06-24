import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, UserPlus, Calendar, CheckSquare, Sparkles, 
  Loader2, Send, X, Download, Copy, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EventGroupChat({ event, isOpen, onClose, onScheduleMeeting, onCreateTask }) {
  const [message, setMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const conversationId = `event_${event.id}`;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['eventChat', conversationId],
    queryFn: () => SDK.entities.Chat.filter({ conversation_id: conversationId }, 'created_date'),
    enabled: isOpen
  });

  // Get unique participants
  const participants = [...new Set(messages.map(m => m.sender_email))].filter(email => email !== 'ai@assistant');

  const sendMessageMutation = useMutation({
    mutationFn: (data) => SDK.entities.Chat.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventChat', conversationId] });
      setMessage('');
    }
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;

    // Check for quick commands
    if (message.startsWith('/schedule')) {
      handleQuickSchedule(message.replace('/schedule', '').trim());
      return;
    }

    if (message.startsWith('/task')) {
      handleQuickTask(message.replace('/task', '').trim());
      return;
    }

    sendMessageMutation.mutate({
      conversation_id: conversationId,
      message: message.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email
    });
  };

  const handleQuickSchedule = async (description) => {
    if (!description) {
      toast.error('Please provide meeting details after /schedule');
      return;
    }

    toast.loading('Creating meeting...', { id: 'quick-schedule' });
    try {
      const result = await SDK.functions.invoke('parseNaturalLanguageEvent', {
        input: description,
        context: { event_title: event.title }
      });

      if (result.data?.event) {
        onScheduleMeeting?.(result.data.event);
        toast.success('Meeting scheduled!', { id: 'quick-schedule' });
        setMessage('');
      }
    } catch (error) {
      toast.error('Failed to schedule meeting', { id: 'quick-schedule' });
    }
  };

  const handleQuickTask = async (description) => {
    if (!description) {
      toast.error('Please provide task details after /task');
      return;
    }

    toast.loading('Creating task...', { id: 'quick-task' });
    try {
      const taskData = {
        title: description,
        event_id: event.id,
        due_date: event.end_date?.split('T')[0],
        status: 'todo',
        priority: 'medium'
      };

      await SDK.entities.Task.create(taskData);
      toast.success('Task created!', { id: 'quick-task' });
      setMessage('');
    } catch (error) {
      toast.error('Failed to create task', { id: 'quick-task' });
    }
  };

  const handleAIAnalyze = async () => {
    if (messages.length === 0) {
      toast.error('No conversation to analyze');
      return;
    }

    setAnalyzing(true);
    toast.loading('AI analyzing conversation...', { id: 'analyze' });

    try {
      const result = await SDK.functions.invoke('analyzeChatForActions', {
        conversation_id: conversationId,
        event_title: event.title,
        messages: messages.map(m => ({
          sender: m.sender_name,
          text: m.message,
          timestamp: m.created_date
        }))
      });

      const suggestions = result.data?.suggestions || [];

      if (suggestions.length > 0) {
        // Send AI summary as message
        const summaryText = `🤖 **AI Analysis**\n\nFound ${suggestions.length} actionable items:\n\n` +
          suggestions.map((s, i) => 
            `${i + 1}. **${s.type.toUpperCase()}**: ${s.description}${s.suggested_date ? ` (${format(new Date(s.suggested_date), 'MMM d')})` : ''}`
          ).join('\n');

        sendMessageMutation.mutate({
          conversation_id: conversationId,
          message: summaryText,
          sender_email: 'ai@assistant',
          sender_name: 'AI Assistant'
        });

        toast.success(`Found ${suggestions.length} actionable items!`, { id: 'analyze' });
      } else {
        toast.info('No actionable items found', { id: 'analyze' });
      }
    } catch (error) {
      toast.error('Analysis failed', { id: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    try {
      // Send invitation message
      await sendMessageMutation.mutateAsync({
        conversation_id: conversationId,
        message: `📧 ${user.full_name || user.email} invited ${inviteEmail} to this conversation`,
        sender_email: 'system@assistant',
        sender_name: 'System'
      });

      // TODO: Send actual email invitation
      toast.success(`Invited ${inviteEmail}!`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (error) {
      toast.error('Failed to send invitation');
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

  const handleAttachToEvent = async () => {
    const transcript = messages.map(m => 
      `[${format(new Date(m.created_date), 'MMM d, h:mm a')}] ${m.sender_name}: ${m.message}`
    ).join('\n\n');

    try {
      const currentNotes = event.notes || '';
      const updatedNotes = currentNotes + 
        (currentNotes ? '\n\n' : '') + 
        `--- Chat Transcript (${format(new Date(), 'MMM d, yyyy')}) ---\n${transcript}`;

      await SDK.entities.Event.update(event.id, {
        notes: updatedNotes
      });

      toast.success('Chat transcript attached to event!');
    } catch (error) {
      toast.error('Failed to attach transcript');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 z-[300]">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            {event.title} - Group Chat
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{participants.length} participants</Badge>
            <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              Invite
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportTranscript} disabled={messages.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={handleAttachToEvent} disabled={messages.length === 0}>
              <FileText className="w-4 h-4 mr-1" />
              Attach to Event
            </Button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation about this event!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_email === user?.email;
              const isAI = msg.sender_email === 'ai@assistant';
              const isSystem = msg.sender_email === 'system@assistant';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {msg.message}
                    </Badge>
                  </div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAI ? 'bg-purple-100' : isMe ? 'bg-teal-100' : 'bg-slate-200'
                  }`}>
                    <span className="text-sm font-medium">
                      {isAI ? '🤖' : msg.sender_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <p className="text-xs text-slate-500 mb-1">
                      {msg.sender_name} • {format(new Date(msg.created_date), 'h:mm a')}
                    </p>
                    <div className={`rounded-2xl px-4 py-3 ${
                      isAI ? 'bg-purple-50 border border-purple-200 text-slate-800' :
                      isMe ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIAnalyze}
              disabled={analyzing || messages.length === 0}
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Analyze & Suggest
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message or use /schedule or /task commands..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim() || sendMessageMutation.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            💡 Quick commands: <code className="bg-slate-100 px-1 rounded">/schedule meeting tomorrow 2pm</code> or <code className="bg-slate-100 px-1 rounded">/task send follow-up email</code>
          </p>
        </div>
      </DialogContent>

      {/* Invite Dialog */}
      {showInvite && (
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite to Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
              />
              <div className="flex gap-2">
                <Button onClick={handleInviteUser} className="flex-1">
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}