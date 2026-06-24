import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CommentThread({ entityType, entityId, compact = false }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ entity_type: entityType, entity_id: entityId }),
    refetchInterval: 3000
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
      toast.success('Comment added');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      content: newComment,
      author_email: user.email,
      author_name: user.full_name || user.email
    });
  };

  const sortedComments = [...comments].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <MessageSquare className="w-4 h-4" />
        Comments ({comments.length})
      </div>

      <div className={`space-y-2 ${compact ? 'max-h-48' : 'max-h-96'} overflow-y-auto`}>
        <AnimatePresence>
          {sortedComments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-50 rounded-lg p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800">
                      {comment.author_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap">{comment.content}</p>
                </div>
                {comment.author_email === user?.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] text-sm resize-none"
        />
        <Button 
          type="submit" 
          size="sm"
          disabled={createCommentMutation.isPending || !newComment.trim()}
        >
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
}