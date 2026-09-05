import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Users, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { NESTED_MENU_Z } from '@/lib/mobile-layout';

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

  const { data: comments = [] } = useQuery({
    queryKey: ['eventComments', eventId],
    queryFn: () => base44.entities.EventComment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: edits = [] } = useQuery({
    queryKey: ['eventEdits', eventId],
    queryFn: () => base44.entities.EventEdit.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 2000
  });

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

  useEffect(() => {
    const now = new Date();
    const activeRecent = edits.filter(edit => {
      if (edit.kind === 'history') return false;
      const lastActive = new Date(edit.last_active || edit.created_date);
      return (now - lastActive) < 60000;
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const historyEdits = (edits || [])
    .filter((e) => e.kind === 'history' || e.new_value != null)
    .sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at))
    .slice(0, 12);

  const otherEditors = activeEditors.filter(e => e.email !== user?.email);

  // Above EventForm (105/110) and EventDetails (120/121)
  const panelZ = NESTED_MENU_Z;

  const overlay = (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        style={{ zIndex: panelZ }}
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 flex pointer-events-none"
        style={{ zIndex: panelZ + 1 }}
      >
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="pointer-events-auto w-[min(24rem,100vw)] h-full bg-white dark:bg-slate-900 border-l shadow-2xl flex flex-col"
        >
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

            {otherEditors.length > 0 && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-white/20 rounded-lg">
                <Users className="w-4 h-4" />
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-white/90">Editing now:</span>
                  {otherEditors.map((editor) => (
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

          {historyEdits.length > 0 && (
            <div className="px-4 py-2 border-b bg-white max-h-36 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Edit history</p>
              <ul className="space-y-1">
                {historyEdits.map((edit) => (
                  <li key={edit.id} className="text-xs text-slate-600">
                    <span className="font-medium">{edit.editor_name || edit.editor_email}</span>
                    {' '}changed {edit.field}{' '}
                    <span className="text-slate-400">
                      {format(new Date(edit.created_date || edit.created_at), 'MMM d, h:mm a')}
                    </span>
                    {edit.new_value != null && (
                      <span className="block truncate text-slate-500">→ {String(edit.new_value)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ScrollArea className="flex-1 p-4 bg-slate-50">
            <div className="space-y-3">
              {comments.map((comment) => {
                const isOwn = comment.user_email === user?.email;
                return (
                  <div
                    key={comment.id}
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
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <MessageSquare className="w-12 h-12 mb-3" />
                <p className="text-sm text-center">No comments yet.<br />Start the discussion!</p>
              </div>
            )}
          </ScrollArea>

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
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}
