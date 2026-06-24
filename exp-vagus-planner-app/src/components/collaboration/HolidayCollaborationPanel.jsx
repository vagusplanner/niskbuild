import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MessageSquare, Send, Lightbulb, CheckCircle2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ExpenseSettlements from '@/components/holiday/ExpenseSettlements';
import AICollaborationTools from './AICollaborationTools';

export default function HolidayCollaborationPanel({ holiday }) {
  const [noteText, setNoteText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    SDK.auth.me().then(setCurrentUser);
  }, []);

  const { data: shares = [] } = useQuery({
    queryKey: ['holiday-shares', holiday?.id],
    queryFn: () => SDK.entities.HolidayShare.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['holiday-comments', holiday?.id],
    queryFn: () => SDK.entities.Comment.filter({ context_id: holiday.id, context_type: 'holiday' }),
    enabled: !!holiday?.id
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => SDK.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-comments'] });
      setNoteText('');
      toast.success('Suggestion added!');
    }
  });

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !currentUser) return;

    addCommentMutation.mutate({
      context_type: 'holiday',
      context_id: holiday.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      message: noteText
    });
  };

  const isOwner = currentUser?.email === holiday.created_by;
  const myShare = shares.find(s => s.shared_with === currentUser?.email && s.status === 'accepted');
  const canEdit = isOwner || myShare?.permission === 'edit' || myShare?.permission === 'manage';

  const activeCollaborators = shares.filter(s => s.status === 'accepted');

  return (
    <Tabs defaultValue="discussion" className="space-y-4">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="discussion">
          <MessageSquare className="w-4 h-4 mr-2" />
          Discussion
        </TabsTrigger>
        <TabsTrigger value="ai-tools">
          <Lightbulb className="w-4 h-4 mr-2" />
          AI Tools
        </TabsTrigger>
        <TabsTrigger value="settlements">
          <DollarSign className="w-4 h-4 mr-2" />
          Settlements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="discussion" className="mt-0">
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-800">Collaboration</h3>
            <Badge variant="outline" className="ml-auto">
              {activeCollaborators.length} collaborator{activeCollaborators.length !== 1 ? 's' : ''}
            </Badge>
          </div>

      {activeCollaborators.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Active Collaborators:</p>
          <div className="flex flex-wrap gap-2">
            {activeCollaborators.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-teal-100 text-teal-700">
                    {share.shared_with.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-slate-700">{share.shared_with}</span>
                <Badge variant="outline" className="text-xs">{share.permission}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleAddNote} className="mb-4">
          <div className="flex items-start gap-2">
            <Textarea
              placeholder="Suggest destinations, activities, or add notes..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[80px]"
            />
            <Button type="submit" size="sm" disabled={addCommentMutation.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}

      {comments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-600">Suggestions & Notes</p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                        {comment.user_name?.charAt(0) || comment.user_email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-700">
                      {comment.user_name || comment.user_email}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 ml-8">{comment.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canEdit && !isOwner && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-700">
            You have view-only access. Ask the owner for edit permission to contribute.
          </p>
        </div>
      )}
        </Card>
      </TabsContent>

      <TabsContent value="ai-tools" className="mt-0">
        <AICollaborationTools holiday={holiday} />
      </TabsContent>

      <TabsContent value="settlements" className="mt-0">
        <ExpenseSettlements holiday={holiday} />
      </TabsContent>
    </Tabs>
  );
}