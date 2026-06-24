import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Users, Heart, Reply, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function VerseDiscussionThread({ surahNumber, verseNumber, verseText }) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const entityId = `quran-${surahNumber}-${verseNumber}`;

  // Fetch comments for this verse
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['verseComments', entityId],
    queryFn: () => base44.entities.Comment.filter({
      entity_type: 'quran_verse',
      entity_id: entityId
    }, '-created_date'),
    refetchInterval: 5000
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.Comment.subscribe((event) => {
      if (event.data.entity_type === 'quran_verse' && event.data.entity_id === entityId) {
        queryClient.invalidateQueries({ queryKey: ['verseComments', entityId] });
      }
    });

    return unsubscribe;
  }, [entityId, queryClient]);

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.Comment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verseComments', entityId] });
      setNewComment('');
      setReplyTo(null);
      toast.success('Comment posted!');
    },
    onError: () => {
      toast.error('Failed to post comment');
    }
  });

  const handleSubmit = () => {
    if (!newComment.trim() || !user) return;

    createCommentMutation.mutate({
      entity_type: 'quran_verse',
      entity_id: entityId,
      content: newComment.trim(),
      author_email: user.email,
      author_name: user.full_name,
      reply_to: replyTo
    });
  };

  const topLevelComments = comments.filter(c => !c.reply_to);
  const getReplies = (commentId) => comments.filter(c => c.reply_to === commentId);

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-900">
            <MessageCircle className="w-5 h-5" />
            Community Discussion
          </div>
          <Badge variant="outline" className="text-purple-700">
            <Users className="w-3 h-3 mr-1" />
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verse Reference */}
        <div className="p-3 bg-white/60 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700 font-medium mb-1">
            Discussing: Surah {surahNumber}, Verse {verseNumber}
          </p>
          <p className="text-xs text-slate-600 line-clamp-2">{verseText}</p>
        </div>

        {/* New Comment Form */}
        <div className="space-y-2">
          {replyTo && (
            <div className="flex items-center justify-between p-2 bg-indigo-100 rounded-lg">
              <span className="text-sm text-indigo-700">
                Replying to comment...
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="text-indigo-600"
              >
                Cancel
              </Button>
            </div>
          )}
          <Textarea
            placeholder="Share your insights, questions, or reflections..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="bg-white"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {replyTo ? 'Post Reply' : 'Post Comment'}
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-purple-600">No comments yet</p>
              <p className="text-sm text-purple-500 mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {topLevelComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  
                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* Main Comment */}
                      <div className="p-4 bg-white rounded-lg border border-purple-100">
                        <div className="flex gap-3">
                          <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                            {comment.author_name?.charAt(0)?.toUpperCase()}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm text-purple-900">
                                  {comment.author_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyTo(comment.id)}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                <Reply className="w-4 h-4 mr-1" />
                                Reply
                              </Button>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="ml-12 space-y-2">
                          {replies.map((reply) => (
                            <motion.div
                              key={reply.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-3 bg-indigo-50 rounded-lg border border-indigo-100"
                            >
                              <div className="flex gap-2">
                                <Avatar className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                  {reply.author_name?.charAt(0)?.toUpperCase()}
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm text-indigo-900">
                                      {reply.author_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {format(new Date(reply.created_date), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}