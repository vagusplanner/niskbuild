import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Calendar, Clock, MapPin, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import MeetingCompletionModal from './MeetingCompletionModal';
import MeetingAIAssistant from './MeetingAIAssistant';

export default function MeetingsList() {
  const [completingMeeting, setCompletingMeeting] = useState(null);
  const [viewingSummary, setViewingSummary] = useState(null);
  const [showingAIAssistant, setShowingAIAssistant] = useState(null);
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => SDK.entities.Meeting.list('-created_date', 50)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => SDK.entities.Meeting.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting status updated');
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No meetings scheduled yet</p>
          </Card>
        ) : (
          meetings.map((meeting, idx) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800">{meeting.title}</h3>
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                    
                    {meeting.description && (
                      <p className="text-sm text-slate-600 mb-2">{meeting.description}</p>
                    )}

                    <div className="space-y-1 text-sm text-slate-600">
                      {meeting.duration_minutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{meeting.duration_minutes} minutes</span>
                        </div>
                      )}
                      {meeting.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{meeting.location}</span>
                        </div>
                      )}
                      {meeting.attendees?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{meeting.attendees.length} attendees</span>
                        </div>
                      )}
                    </div>

                    {meeting.proposed_times?.length > 0 && meeting.status === 'pending' && (
                      <div className="mt-3 p-2 bg-slate-50 rounded">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Proposed Times:</p>
                        {meeting.proposed_times.slice(0, 3).map((time, i) => (
                          <p key={i} className="text-xs text-slate-600">
                            • {format(parseISO(time.date), 'MMM d')} at {time.start_time} - {time.end_time}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {meeting.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => setCompletingMeeting(meeting)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}

                    {meeting.status === 'completed' && (
                      <>
                        {meeting.ai_summary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingSummary(meeting)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Summary
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowingAIAssistant(meeting)}
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Users className="w-4 h-4 mr-1" />
                          AI Assist
                        </Button>
                      </>
                    )}

                    {meeting.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: meeting.id, status: 'confirmed' })}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </div>

                {meeting.status === 'completed' && meeting.completed_at && (
                  <div className="pt-3 border-t text-xs text-slate-500">
                    Completed {format(parseISO(meeting.completed_at), 'MMM d, yyyy')}
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {completingMeeting && (
        <MeetingCompletionModal
          meeting={completingMeeting}
          isOpen={true}
          onClose={() => setCompletingMeeting(null)}
          onComplete={() => {
            setCompletingMeeting(null);
            queryClient.invalidateQueries({ queryKey: ['meetings'] });
          }}
        />
      )}

      {viewingSummary && (
        <SummaryViewModal
          meeting={viewingSummary}
          isOpen={true}
          onClose={() => setViewingSummary(null)}
        />
      )}

      {showingAIAssistant && (
        <Dialog open={true} onOpenChange={() => setShowingAIAssistant(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Meeting Assistant: {showingAIAssistant.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <MeetingAIAssistant
                meeting={showingAIAssistant}
                onCreateTask={async (taskData) => {
                  await SDK.entities.Task.create(taskData);
                  queryClient.invalidateQueries({ queryKey: ['tasks'] });
                }}
                onCreateMeeting={async (meetingData) => {
                  await SDK.entities.Meeting.create(meetingData);
                  queryClient.invalidateQueries({ queryKey: ['meetings'] });
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function SummaryViewModal({ meeting, isOpen, onClose }) {
  const summary = meeting.ai_summary ? JSON.parse(meeting.ai_summary) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting Summary: {meeting.title}</DialogTitle>
        </DialogHeader>

        {summary && (
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-sm text-slate-700">{summary.summary}</p>
            </Card>

            {summary.key_decisions?.length > 0 && (
              <Card className="p-4 bg-green-50 border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Key Decisions</h3>
                <ul className="space-y-1">
                  {summary.key_decisions.map((decision, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      {decision}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {summary.action_items?.length > 0 && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-2">Action Items</h3>
                <div className="space-y-2">
                  {summary.action_items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-slate-800">{item.task}</p>
                      <div className="flex gap-2 mt-1">
                        {item.owner && <Badge variant="outline" className="text-xs">{item.owner}</Badge>}
                        {item.deadline && <Badge variant="outline" className="text-xs">{item.deadline}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {meeting.outcome_notes && (
              <Card className="p-4 bg-slate-50">
                <h3 className="font-semibold mb-2">Original Notes</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.outcome_notes}</p>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}