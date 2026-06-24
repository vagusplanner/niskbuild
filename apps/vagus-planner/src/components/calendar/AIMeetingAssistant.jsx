import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mic, 
  Brain, 
  CheckSquare, 
  Calendar, 
  Loader2, 
  FileText,
  Sparkles,
  Users,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AIMeetingAssistant({ meeting, onClose }) {
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [activeStep, setActiveStep] = useState('input'); // input, analyzing, results
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queryClient = useQueryClient();

  const handleTranscribe = async () => {
    setIsProcessing(true);
    setActiveStep('analyzing');
    
    try {
      // Step 1: Transcribe (in real implementation, this would capture audio)
      toast.info('Processing transcript...');
      
      // Step 2: Analyze
      const { data } = await base44.functions.invoke('aiMeetingAssistant', {
        meeting_id: meeting.id,
        transcript: transcript || `Discussion about ${meeting.title}. Team discussed project progress, identified blockers, and planned next steps.`,
        action: 'analyze'
      });

      if (data.success) {
        setAnalysis(data.analysis);
        setActiveStep('results');
        toast.success('Meeting analyzed successfully!');
      }
    } catch (error) {
      toast.error('Failed to analyze meeting');
      setActiveStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleFollowups = async () => {
    setIsProcessing(true);
    
    try {
      const { data } = await base44.functions.invoke('aiMeetingAssistant', {
        meeting_id: meeting.id,
        action: 'schedule_followups'
      });

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['meetings'] });
        toast.success(`Created ${data.tasks_created} tasks and ${data.meetings_created} follow-up meetings!`);
      }
    } catch (error) {
      toast.error('Failed to schedule follow-ups');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendFollowUpEmail = async () => {
    setIsProcessing(true);
    
    try {
      const { data } = await base44.functions.invoke('aiMeetingAssistant', {
        meeting_id: meeting.id,
        action: 'send_followup_email'
      });

      if (data.success) {
        toast.success(`Follow-up email sent to ${data.recipients_count} attendees!`);
      }
    } catch (error) {
      toast.error('Failed to send follow-up email');
    } finally {
      setIsProcessing(false);
    }
  };

  const sentimentColors = {
    positive: 'bg-green-100 text-green-800',
    neutral: 'bg-blue-100 text-blue-800',
    negative: 'bg-red-100 text-red-800',
    mixed: 'bg-amber-100 text-amber-800'
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Meeting Assistant</h2>
                <p className="text-purple-100 text-sm">{meeting.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Meeting Info */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Attendees</p>
                  <p className="font-medium text-slate-800">
                    {meeting.attendees?.length || 0} participants
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Duration</p>
                  <p className="font-medium text-slate-800">{meeting.duration_minutes || 30} min</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Status</p>
                  <Badge className="bg-purple-100 text-purple-800">{meeting.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {activeStep === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="w-5 h-5 text-purple-600" />
                      Meeting Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">
                      Paste or type the meeting transcript below, or leave empty to use simulation:
                    </p>
                    <Textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Enter meeting transcript here... (or leave empty for demo)"
                      className="min-h-[200px] resize-none"
                    />
                    <Button
                      onClick={handleTranscribe}
                      disabled={isProcessing}
                      className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Analyze Meeting
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeStep === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Analyzing Meeting...</h3>
                <p className="text-slate-600">AI is processing the transcript and extracting insights</p>
              </motion.div>
            )}

            {activeStep === 'results' && analysis && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Summary */}
                <Card className="border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Meeting Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={sentimentColors[analysis.sentiment]}>
                        {analysis.sentiment} tone
                      </Badge>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Discussion Points */}
                {analysis.discussion_points?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Key Discussion Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.discussion_points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span className="text-slate-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Action Items */}
                {analysis.action_items?.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-amber-600" />
                        Action Items ({analysis.action_items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.action_items.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-800 flex-1">{item.task}</p>
                              <Badge className={priorityColors[item.priority]}>
                                {item.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                              {item.assigned_to && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {item.assigned_to}
                                </span>
                              )}
                              {item.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Due: {format(new Date(item.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Decisions */}
                {analysis.decisions?.length > 0 && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        Decisions Made
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.decisions.map((decision, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded border border-green-200">
                            <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                            <span className="text-slate-700">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Follow-ups */}
                {analysis.follow_ups?.length > 0 && (
                  <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Follow-up Meetings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.follow_ups.map((followUp, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-200">
                            <p className="font-medium text-slate-800">{followUp.topic}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              Suggested: {format(new Date(followUp.suggested_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={handleSendFollowUpEmail}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Send Follow-up Email
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleScheduleFollowups}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Tasks & Meetings
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    setActiveStep('input');
                    setAnalysis(null);
                    setTranscript('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Analyze Another Meeting
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}