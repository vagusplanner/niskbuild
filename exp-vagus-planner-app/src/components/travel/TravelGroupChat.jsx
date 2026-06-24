import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plane, UserPlus, Calendar, CheckSquare, Sparkles, 
  Loader2, Send, X, Download, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TravelGroupChat({ holiday, isOpen, onClose }) {
  const [message, setMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const conversationId = `holiday_${holiday.id}`;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['travelChat', conversationId],
    queryFn: () => SDK.entities.Chat.filter({ conversation_id: conversationId }, 'created_date'),
    enabled: isOpen
  });

  const participants = [...new Set(messages.map(m => m.sender_email))].filter(email => email !== 'ai@assistant');

  const sendMessageMutation = useMutation({
    mutationFn: (data) => SDK.entities.Chat.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelChat', conversationId] });
      setMessage('');
    }
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;

    // Quick commands
    if (message.startsWith('/activity')) {
      handleQuickActivity(message.replace('/activity', '').trim());
      return;
    }

    if (message.startsWith('/expense')) {
      handleQuickExpense(message.replace('/expense', '').trim());
      return;
    }

    sendMessageMutation.mutate({
      conversation_id: conversationId,
      message: message.trim(),
      sender_email: user.email,
      sender_name: user.full_name || user.email
    });
  };

  const handleQuickActivity = async (description) => {
    if (!description) {
      toast.error('Please provide activity details after /activity');
      return;
    }

    toast.success('Activity suggestion added to chat!');
    sendMessageMutation.mutate({
      conversation_id: conversationId,
      message: `📍 Activity Suggestion: ${description}`,
      sender_email: user.email,
      sender_name: user.full_name || user.email
    });
  };

  const handleQuickExpense = async (description) => {
    if (!description) {
      toast.error('Please provide expense details after /expense');
      return;
    }

    toast.success('Expense noted!');
    sendMessageMutation.mutate({
      conversation_id: conversationId,
      message: `💰 Expense: ${description}`,
      sender_email: user.email,
      sender_name: user.full_name || user.email
    });
  };

  const handleAIAnalyze = async () => {
    if (messages.length === 0) {
      toast.error('No conversation to analyze');
      return;
    }

    setAnalyzing(true);
    toast.loading('AI analyzing travel plans...', { id: 'analyze' });

    try {
      const result = await SDK.functions.invoke('analyzeChatForActions', {
        conversation_id: conversationId,
        event_title: holiday.title,
        messages: messages.map(m => ({
          sender: m.sender_name,
          text: m.message,
          timestamp: m.created_date
        }))
      });

      const suggestions = result.data?.suggestions || [];

      if (suggestions.length > 0) {
        const summaryText = `🤖 **AI Travel Suggestions**\n\nFound ${suggestions.length} items:\n\n` +
          suggestions.map((s, i) => 
            `${i + 1}. **${s.type.toUpperCase()}**: ${s.description}`
          ).join('\n');

        sendMessageMutation.mutate({
          conversation_id: conversationId,
          message: summaryText,
          sender_email: 'ai@assistant',
          sender_name: 'AI Assistant'
        });

        toast.success(`Found ${suggestions.length} suggestions!`, { id: 'analyze' });
      } else {
        toast.info('No suggestions found', { id: 'analyze' });
      }
    } catch (error) {
      toast.error('Analysis failed', { id: 'analyze' });
    } finally {
      setAnalyzing(false);
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
    a.download = `${holiday.title}-travel-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded!');
  };

  const handleAttachToTrip = async () => {
    const transcript = messages.map(m => 
      `[${format(new Date(m.created_date), 'MMM d, h:mm a')}] ${m.sender_name}: ${m.message}`
    ).join('\n\n');

    try {
      const currentNotes = holiday.notes || '';
      const updatedNotes = currentNotes + 
        (currentNotes ? '\n\n' : '') + 
        `--- Travel Planning Chat (${format(new Date(), 'MMM d, yyyy')}) ---\n${transcript}`;

      await SDK.entities.Holiday.update(holiday.id, {
        notes: updatedNotes
      });

      toast.success('Chat attached to trip!');
    } catch (error) {
      toast.error('Failed to attach transcript');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversation_id: conversationId,
        message: `📧 ${user.full_name || user.email} invited ${inviteEmail} to this travel chat`,
        sender_email: 'system@assistant',
        sender_name: 'System'
      });

      toast.success(`Invited ${inviteEmail}!`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-teal-600" />
            {holiday.title} - Travel Planning Chat
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
            <Button variant="ghost" size="sm" onClick={handleAttachToTrip} disabled={messages.length === 0}>
              <FileText className="w-4 h-4 mr-1" />
              Attach to Trip
            </Button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Plane className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start planning your trip together!</p>
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
              AI Analyze
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Plan your trip or use /activity or /expense commands..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim() || sendMessageMutation.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            💡 Quick commands: <code className="bg-slate-100 px-1 rounded">/activity visit Eiffel Tower</code> or <code className="bg-slate-100 px-1 rounded">/expense dinner $50</code>
          </p>
        </div>
      </DialogContent>

      {/* Invite Dialog */}
      {showInvite && (
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite to Travel Chat</DialogTitle>
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