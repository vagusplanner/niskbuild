import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, CheckCircle2, Clock, User, ArrowRight, Mic, Upload, FileAudio } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

export default function MeetingCompletionModal({ meeting, isOpen, onClose, onComplete }) {
  const isMobile = useIsMobile();
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [step, setStep] = useState(1); // 1: input notes, 2: review summary
  const [audioFile, setAudioFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual' or 'audio'

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio')) {
      toast.error('Please upload an audio file');
      return;
    }

    setAudioFile(file);
    setTranscribing(true);

    try {
      // Upload audio file
      const { data: uploadData } = await SDK.integrations.Core.UploadFile({ file });
      
      toast.info('Transcribing audio... This may take a moment');

      // Transcribe and analyze
      const { data } = await SDK.functions.invoke('transcribeAndSummarizeMeeting', {
        audio_url: uploadData.file_url,
        meeting_title: meeting.title,
        meeting_description: meeting.description
      });

      setOutcomeNotes(data.draft_notes);
      toast.success('Audio transcribed and notes generated!');
    } catch (error) {
      toast.error('Failed to transcribe audio: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

  const generateSummary = async () => {
    if (!outcomeNotes.trim()) {
      toast.error('Please enter meeting outcome notes');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await SDK.functions.invoke('aiMeetingAssistant', {
        action: 'summarize_outcome',
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        outcome_notes: outcomeNotes
      });

      setSummary(data.summary);
      setStep(2);
      toast.success('Summary generated!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async () => {
    try {
      await SDK.entities.Meeting.update(meeting.id, {
        status: 'completed',
        outcome_notes: outcomeNotes,
        ai_summary: JSON.stringify(summary),
        completed_at: new Date().toISOString()
      });

      // Create tasks from action items if any
      if (summary?.action_items?.length > 0) {
        for (const item of summary.action_items) {
          const dueDate = item.deadline ? parseDateFromText(item.deadline) : null;
          
          await SDK.entities.Task.create({
            title: item.task,
            description: `Action item from meeting: ${meeting.title}`,
            status: 'todo',
            assigned_to: item.owner || '',
            due_date: dueDate,
            priority: 'medium',
            category: 'work'
          });
        }
        toast.success(`Created ${summary.action_items.length} tasks from action items`);
      }

      onComplete();
      toast.success('Meeting marked as completed');
      onClose();
    } catch (error) {
      toast.error('Failed to complete meeting');
    }
  };

  const parseDateFromText = (text) => {
    // Simple date parsing - can be enhanced
    const today = new Date();
    if (text.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (text.includes('week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    return null;
  };

  const reset = () => {
    setOutcomeNotes('');
    setSummary(null);
    setStep(1);
    setAudioFile(null);
    setInputMethod('manual');
  };

  const handleOpenChange = (open) => {
    if (!open) { reset(); onClose(); }
  };

  const content = (
    <AnimatePresence mode="wait">
      {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4 py-4"
            >
              <Tabs value={inputMethod} onValueChange={setInputMethod} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Manual Notes
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="gap-2">
                    <Mic className="w-4 h-4" />
                    Audio Transcription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="outcome-notes" className="text-base font-semibold mb-2 block">
                      Meeting Outcome & Discussion Notes
                    </Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Describe what was discussed, decisions made, action items, and any important points.
                    </p>
                    <Textarea
                      id="outcome-notes"
                      placeholder="Example:&#10;- Discussed Q1 marketing strategy&#10;- Decided to increase social media budget by 20%&#10;- John will prepare campaign proposal by Friday&#10;- Need to schedule follow-up with design team&#10;- Sarah raised concerns about timeline"
                      value={outcomeNotes}
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                      rows={12}
                      className="text-sm"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="audio" className="space-y-4 mt-4">
                  <div>
                    <Label className="text-base font-semibold mb-2 block">
                      Upload Meeting Recording
                    </Label>
                    <p className="text-sm text-slate-600 mb-3">
                      Upload an audio file and AI will transcribe and extract key points automatically
                    </p>
                    
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        disabled={transcribing}
                        className="hidden"
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer block">
                        {transcribing ? (
                          <div className="space-y-3">
                            <Loader2 className="w-12 h-12 mx-auto text-purple-600 animate-spin" />
                            <p className="text-sm font-medium text-purple-600">Transcribing audio...</p>
                            <p className="text-xs text-slate-500">This may take a minute</p>
                          </div>
                        ) : audioFile ? (
                          <div className="space-y-2">
                            <FileAudio className="w-12 h-12 mx-auto text-green-600" />
                            <p className="text-sm font-medium text-slate-700">{audioFile.name}</p>
                            <p className="text-xs text-slate-500">Click to change file</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-12 h-12 mx-auto text-slate-400" />
                            <p className="text-sm font-medium text-slate-700">Click to upload audio</p>
                            <p className="text-xs text-slate-500">MP3, WAV, M4A, or other audio formats</p>
                          </div>
                        )}
                      </label>
                    </div>

                    {outcomeNotes && inputMethod === 'audio' && (
                      <div className="mt-4">
                        <Label className="text-sm font-semibold mb-2 block">Generated Draft Notes</Label>
                        <Textarea
                          value={outcomeNotes}
                          onChange={(e) => setOutcomeNotes(e.target.value)}
                          rows={10}
                          className="text-sm"
                          placeholder="AI-generated notes will appear here..."
                        />
                        <p className="text-xs text-slate-500 mt-2">Review and edit the generated notes before proceeding</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-purple-900 mb-1">AI Will Generate:</p>
                    <ul className="text-xs text-purple-800 space-y-1">
                      <li>• Key decisions and outcomes</li>
                      <li>• Action items with owners and deadlines</li>
                      <li>• Follow-up points to address</li>
                      <li>• Suggestions for next meeting</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateSummary}
                  disabled={generating || !outcomeNotes.trim() || transcribing}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Summary
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && summary && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 py-4"
            >
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <h3 className="font-semibold text-slate-800 mb-2">Meeting Summary</h3>
                <p className="text-sm text-slate-700">{summary.summary}</p>
              </Card>

              {summary.key_decisions?.length > 0 && (
                <Card className="p-4 border-green-200 bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Key Decisions
                  </h3>
                  <ul className="space-y-2">
                    {summary.key_decisions.map((decision, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        {decision}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {summary.action_items?.length > 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Action Items
                    <Badge className="bg-purple-100 text-purple-700 ml-auto">
                      {summary.action_items.length} tasks will be created
                    </Badge>
                  </h3>
                  <div className="space-y-3">
                    {summary.action_items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                        <p className="font-medium text-slate-800 text-sm mb-2">{item.task}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.owner && (
                            <Badge variant="outline" className="text-xs">
                              <User className="w-3 h-3 mr-1" />
                              {item.owner}
                            </Badge>
                          )}
                          {item.deadline && (
                            <Badge variant="outline" className="text-xs bg-amber-100">
                              <Clock className="w-3 h-3 mr-1" />
                              {item.deadline}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {summary.follow_ups?.length > 0 && (
                <Card className="p-4 border-purple-200 bg-purple-50">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Follow-up Points
                  </h3>
                  <ul className="space-y-1">
                    {summary.follow_ups.map((followup, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-purple-600">→</span>
                        {followup}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {summary.next_meeting_suggestions && (
                <Card className="p-4 border-indigo-200 bg-indigo-50">
                  <h3 className="font-semibold text-indigo-900 mb-2">Next Meeting Suggestions</h3>
                  <p className="text-sm text-slate-700">{summary.next_meeting_suggestions}</p>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  ← Edit Notes
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Meeting & Save
                </Button>
              </div>
            </motion.div>
          )}
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Complete Meeting: {meeting?.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            Complete Meeting: {meeting?.title}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}