import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Users, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

const USER_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#06b6d4', '#f43f5e', '#a855f7'
];

export default function EventCollaborationPanel({ eventId, onClose }) {
  const [message, setMessage] = useState('');
  const [activeEditors, setActiveEditors] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['eventComments', eventId],
    queryFn: () => base44.entities.EventComment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  // Fetch active editors
  const { data: edits = [] } = useQuery({
    queryKey: ['eventEdits', eventId],
    queryFn: () => base44.entities.EventEdit.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 2000
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!eventId) return;

    const unsubComments = base44.entities.EventComment.subscribe((event) => {
      if (event.data?.event_id === eventId) {
        queryClient.invalidateQueries({ queryKey: ['eventComments', eventId] });
      }
    });

    const unsubEdits = base44.entities.EventEdit.subscribe((event) => {
      if (event.data?.event_id === eventId) {
        queryClient.invalidateQueries({ queryKey: ['eventEdits', eventId] });
      }
    });

    return () => {
      unsubComments();
      unsubEdits();
    };
  }, [eventId, queryClient]);

  // Track active editors
  useEffect(() => {
    const now = new Date();
    const activeRecent = edits.filter(edit => {
      const lastActive = new Date(edit.last_active || edit.created_date);
      return (now - lastActive) < 60000; // Active in last 60 seconds
    });
    
    const uniqueEditors = [...new Set(activeRecent.map(e => e.editor_email))];
    setActiveEditors(uniqueEditors.map(email => {
      const edit = activeRecent.find(e => e.editor_email === email);
      return {
        email,
        name: edit.editor_name || email.split('@')[0],
        color: edit.color || USER_COLORS[uniqueEditors.indexOf(email) % USER_COLORS.length]
      };
    }));
  }, [edits]);

  // Send comment mutation
  const sendCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.EventComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventComments', eventId] });
      setMessage('');
    }
  });

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    sendCommentMutation.mutate({
      event_id: eventId,
      user_email: user.email,
      user_name: user.full_name || user.email,
      message: message.trim()
    });
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const otherEditors = activeEditors.filter(e => e.email !== user?.email);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h3 className="font-semibold">Event Discussion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Editors */}
        {otherEditors.length > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-white/20 rounded-lg">
            <Users className="w-4 h-4" />
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-white/90">Editing now:</span>
              {otherEditors.map((editor, idx) => (
                <Badge 
                  key={editor.email}
                  className="text-xs"
                  style={{ backgroundColor: editor.color, borderColor: editor.color }}
                >
                  {editor.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments/Messages */}
      <ScrollArea className="flex-1 p-4 bg-slate-50">
        <div className="space-y-3">
          <AnimatePresence>
            {comments.map((comment, idx) => {
              const isOwn = comment.user_email === user?.email;
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <span className="text-xs text-slate-500 mb-1 px-2">
                        {comment.user_name}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-teal-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      <p className="text-sm">{comment.message}</p>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 px-2">
                      {format(new Date(comment.created_date), 'h:mm a')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-sm text-center">No comments yet.<br />Start the discussion!</p>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendComment} className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a comment..."
            className="flex-1 h-10 rounded-full border-slate-300"
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendCommentMutation.isPending}
            size="icon"
            className="rounded-full h-10 w-10 bg-teal-600 hover:bg-teal-700"
          >
            {sendCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}