import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, Users, MapPin, Sparkles, Loader2, 
  Plus, Trash2, Send, Link, Copy, Check, Mail, ListTodo, CheckSquare
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, parseISO } from 'date-fns';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MeetingAssistant from './MeetingAssistant';
import SmartMeetingTimeSelector from './SmartMeetingTimeSelector';
import AIAgendaGenerator from './AIAgendaGenerator';

export default function MeetingScheduler({ isOpen, onClose, onSave, events = [], settings = {}, meetings = [] }) {
  const queryClient = useQueryClient();

  const createMeetingMutation = useMutation({
    mutationFn: (data) => SDK.entities.Meeting.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['meetings'] });
      const previous = queryClient.getQueryData(['meetings']);
      queryClient.setQueryData(['meetings'], (old = []) => [
        { ...data, id: `temp-${Date.now()}` }, ...old
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['meetings'], context?.previous);
      toast.error('Failed to schedule meeting');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    }
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attendees: [],
    duration_minutes: 30,
    location: '',
    proposed_times: []
  });
  const [newAttendee, setNewAttendee] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [followUpTasks, setFollowUpTasks] = useState(null);
  const [showTasksPanel, setShowTasksPanel] = useState(false);

  const handleAddAttendee = () => {
    if (newAttendee && newAttendee.includes('@')) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee]
      }));
      setNewAttendee('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const handleRemoveAttendee = (email) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== email)
    }));
  };

  const handleAddProposedTime = (slot) => {
    setFormData(prev => ({
      ...prev,
      proposed_times: [...prev.proposed_times, slot]
    }));
    setSuggestedSlots(prev => prev.filter(s => 
      s.date !== slot.date || s.start_time !== slot.start_time
    ));
    toast.success('Time slot added');
  };

  const handleRemoveProposedTime = (index) => {
    setFormData(prev => ({
      ...prev,
      proposed_times: prev.proposed_times.filter((_, i) => i !== index)
    }));
  };

  const getAISuggestions = async () => {
    if (!formData.title) {
      toast.error('Please enter a meeting title first');
      return;
    }

    setAiSuggesting(true);
    try {
      // Get next 14 days of events
      const upcomingEvents = events
        .filter(e => new Date(e.date) >= new Date())
        .slice(0, 50)
        .map(e => ({
          date: e.date,
          start_time: e.start_time,
          end_time: e.end_time,
          title: e.title
        }));

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `I need to schedule a ${formData.duration_minutes} minute meeting titled "${formData.title}".

Here are my existing events for the next 2 weeks:
${JSON.stringify(upcomingEvents, null, 2)}

Today is ${format(new Date(), 'yyyy-MM-dd')}.

Please suggest 5 optimal time slots for this meeting over the next 7 days:
- Avoid conflicts with existing events
- Prefer business hours (9 AM - 6 PM) unless it's a personal meeting
- Space suggestions across different days
- Consider the meeting title to infer if it's work/personal

For each slot, calculate end_time based on the ${formData.duration_minutes} minute duration.
Return times in HH:MM format (24-hour).`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.suggestions?.length > 0) {
        setSuggestedSlots(result.suggestions);
        toast.success(`Found ${result.suggestions.length} available slots`);
      } else {
        toast.error('Could not find available slots');
      }
    } catch (error) {
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSendInvites = async () => {
    if (formData.proposed_times.length === 0) {
      toast.error('Please add at least one proposed time');
      return;
    }
    if (formData.attendees.length === 0) {
      toast.error('Please add at least one attendee');
      return;
    }

    setSendingInvites(true);
    try {
      // Create meeting record
      const user = await SDK.auth.me();
      const schedulingLink = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const meeting = await createMeetingMutation.mutateAsync({
        ...formData,
        organizer_email: user.email,
        scheduling_link: schedulingLink,
        status: 'pending'
      });

      // Send invite emails to attendees
      const timesList = formData.proposed_times.map((t, i) => 
        `${i + 1}. ${format(parseISO(t.date), 'EEEE, MMM d')} at ${t.start_time} - ${t.end_time}`
      ).join('\n');

      for (const attendee of formData.attendees) {
        await SDK.integrations.Core.SendEmail({
          to: attendee,
          subject: `Meeting Request: ${formData.title}`,
          body: `You've been invited to a meeting!

Meeting: ${formData.title}
${formData.description ? `Description: ${formData.description}\n` : ''}
Duration: ${formData.duration_minutes} minutes
${formData.location ? `Location: ${formData.location}\n` : ''}

Proposed times:
${timesList}

Please reply with your availability.

Organized by: ${user.full_name || user.email}`
        });
      }

      toast.success('Meeting invites sent successfully!');
      onSave(meeting);
      onClose();
    } catch (error) {
      toast.error('Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  };

  const copySchedulingLink = () => {
    const link = `${window.location.origin}/schedule/${formData.scheduling_link || 'new'}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success('Scheduling link copied!');
  };

  const generateFollowUpTasks = async () => {
    if (!formData.title) {
      toast.error('Please enter a meeting title first');
      return;
    }

    setGeneratingTasks(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Based on this meeting information, generate a comprehensive follow-up plan:

Meeting Title: ${formData.title}
Description: ${formData.description || 'Not provided'}
Duration: ${formData.duration_minutes} minutes
Attendees: ${formData.attendees.join(', ') || 'Not specified'}
Location: ${formData.location || 'Not specified'}

Generate:
1. A brief meeting summary/purpose
2. 3-5 actionable follow-up tasks that typically result from this type of meeting
3. Suggested deadlines for each task (relative to meeting date, e.g., "2 days after", "1 week after")
4. Who should be responsible (based on attendees or role types)
5. Any preparation tasks needed BEFORE the meeting

Make the tasks specific, actionable, and relevant to the meeting context.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            preparation_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  deadline_offset: { type: "string" },
                  assigned_to: { type: "string" }
                }
              }
            },
            follow_up_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  deadline_offset: { type: "string" },
                  assigned_to: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setFollowUpTasks(result);
      setShowTasksPanel(true);
      toast.success('Follow-up tasks generated!');
    } catch (error) {
      toast.error('Failed to generate follow-up tasks');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const saveTasksAsEvents = async () => {
    if (!followUpTasks || !formData.proposed_times[0]) {
      toast.error('Please add at least one meeting time first');
      return;
    }

    try {
      const meetingDate = parseISO(formData.proposed_times[0].date);
      const allTasks = [
        ...(followUpTasks.preparation_tasks || []),
        ...(followUpTasks.follow_up_tasks || [])
      ];

      for (const task of allTasks) {
        let taskDate = meetingDate;
        
        // Calculate task date based on offset
        if (task.deadline_offset.includes('before')) {
          const days = parseInt(task.deadline_offset);
          taskDate = addDays(meetingDate, -Math.abs(days || 1));
        } else if (task.deadline_offset.includes('after')) {
          const days = parseInt(task.deadline_offset);
          taskDate = addDays(meetingDate, days || 1);
        }

        await SDK.entities.Event.create({
          title: task.title,
          description: `${task.description}\n\nRelated to meeting: ${formData.title}\nAssigned to: ${task.assigned_to}`,
          date: format(taskDate, 'yyyy-MM-dd'),
          category: 'work',
          is_all_day: false,
          start_time: '09:00',
          end_time: '10:00',
          notes: `Priority: ${task.priority || 'Medium'}`
        });
      }

      toast.success(`${allTasks.length} tasks added to calendar!`);
      setShowTasksPanel(false);
    } catch (error) {
      toast.error('Failed to save tasks');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  <h2 className="text-xl font-semibold">Schedule Meeting</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-emerald-100 text-sm mt-1">
                Let AI find the best times for your meeting
              </p>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-5">
              {/* Meeting Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Weekly Team Standup"
                  className="h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description / Agenda</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Discuss project updates and blockers..."
                  rows={2}
                />
              </div>

              {/* Duration and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Duration
                  </Label>
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Location
                  </Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Zoom / Office Room"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Smart Meeting Time Selector with AI */}
              {formData.attendees.length > 0 && formData.title && (
                <SmartMeetingTimeSelector
                  meetingTitle={formData.title}
                  attendees={formData.attendees}
                  duration={formData.duration_minutes}
                  onSelectTime={(slot) => {
                    const proposedTime = {
                      date: slot.date,
                      start_time: slot.start_time,
                      end_time: slot.end_time
                    };
                    if (!formData.proposed_times.some(t => 
                      t.date === slot.date && t.start_time === slot.start_time
                    )) {
                      setFormData(prev => ({
                        ...prev,
                        proposed_times: [...prev.proposed_times, proposedTime]
                      }));
                      toast.success('Optimal time added!');
                    }
                  }}
                />
              )}

              {/* AI Agenda Generator */}
              {formData.title && (
                <AIAgendaGenerator
                  meetingTitle={formData.title}
                  description={formData.description}
                  attendees={formData.attendees}
                  duration={formData.duration_minutes}
                  onApplyAgenda={(agenda) => {
                    const agendaText = agenda.agenda?.map((item, idx) => 
                      `${idx + 1}. ${item.title} (${item.duration_minutes}min)\n` +
                      `   Objectives: ${item.objectives?.join(', ')}\n` +
                      `   Points: ${item.talking_points?.join(', ')}\n`
                    ).join('\n\n');
                    setFormData(prev => ({
                      ...prev,
                      description: (prev.description ? prev.description + '\n\n' : '') + 
                        '📋 AI-Generated Agenda:\n\n' + agendaText
                    }));
                    toast.success('Agenda applied to description!');
                  }}
                />
              )}

              {/* AI Meeting Assistant */}
              <MeetingAssistant
                events={events}
                meetings={meetings}
                formData={formData}
                onUpdateForm={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
                onAddTimeSlot={(slot) => {
                  if (!formData.proposed_times.some(t => 
                    t.date === slot.date && t.start_time === slot.start_time
                  )) {
                    setFormData(prev => ({
                      ...prev,
                      proposed_times: [...prev.proposed_times, slot]
                    }));
                    toast.success('Time slot added by assistant');
                  }
                }}
                onAddAttendee={(email) => {
                  if (email.includes('@') && !formData.attendees.includes(email)) {
                    setFormData(prev => ({
                      ...prev,
                      attendees: [...prev.attendees, email]
                    }));
                    toast.success(`Added ${email}`);
                  }
                }}
              />

              {/* Attendees */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Attendees
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    placeholder="colleague@email.com"
                    className="h-11"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                  />
                  <Button type="button" onClick={handleAddAttendee} className="h-11 px-4">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.attendees.map((email) => (
                      <Badge key={email} variant="secondary" className="py-1.5 px-3">
                        {email}
                        <button
                          onClick={() => handleRemoveAttendee(email)}
                          className="ml-2 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    AI-Suggested Times
                  </Label>
                  <Button
                    type="button"
                    onClick={getAISuggestions}
                    disabled={aiSuggesting || !formData.title}
                    size="sm"
                    variant="outline"
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {aiSuggesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finding slots...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Find Best Times
                      </>
                    )}
                  </Button>
                </div>

                {suggestedSlots.length > 0 && (
                  <div className="space-y-2">
                    {suggestedSlots.map((slot, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {format(parseISO(slot.date), 'EEEE, MMM d')}
                          </p>
                          <p className="text-sm text-slate-600">
                            {slot.start_time} - {slot.end_time}
                          </p>
                          {slot.reason && (
                            <p className="text-xs text-purple-600 mt-1">{slot.reason}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddProposedTime(slot)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Proposed Times */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Selected Time Slots ({formData.proposed_times.length})
                </Label>
                {formData.proposed_times.length > 0 ? (
                  <div className="space-y-2">
                    {formData.proposed_times.map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {format(parseISO(slot.date), 'EEEE, MMM d')}
                            </p>
                            <p className="text-sm text-slate-600">
                              {slot.start_time} - {slot.end_time}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveProposedTime(idx)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed rounded-xl text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No times selected yet</p>
                    <p className="text-xs">Use AI suggestions or add manually</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Follow-up Tasks Panel */}
            <AnimatePresence>
              {showTasksPanel && followUpTasks && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-indigo-600" />
                        AI-Generated Follow-up Plan
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowTasksPanel(false)}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Summary */}
                    {followUpTasks.summary && (
                      <div className="p-3 bg-white rounded-xl">
                        <p className="text-sm font-medium text-slate-600 mb-1">Meeting Purpose</p>
                        <p className="text-sm text-slate-700">{followUpTasks.summary}</p>
                      </div>
                    )}

                    {/* Preparation Tasks */}
                    {followUpTasks.preparation_tasks?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-800 mb-2">Before Meeting</h4>
                        <div className="space-y-2">
                          {followUpTasks.preparation_tasks.map((task, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-indigo-100">
                              <div className="flex items-start gap-2">
                                <CheckSquare className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                                  <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                                  <div className="flex gap-3 mt-2">
                                    <Badge variant="outline" className="text-xs bg-indigo-50">
                                      {task.deadline_offset}
                                    </Badge>
                                    {task.assigned_to && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.assigned_to}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Tasks */}
                    {followUpTasks.follow_up_tasks?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-purple-800 mb-2">After Meeting</h4>
                        <div className="space-y-2">
                          {followUpTasks.follow_up_tasks.map((task, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-purple-100">
                              <div className="flex items-start gap-2">
                                <CheckSquare className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                                  <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                                  <div className="flex gap-3 mt-2">
                                    <Badge variant="outline" className="text-xs bg-purple-50">
                                      {task.deadline_offset}
                                    </Badge>
                                    {task.assigned_to && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.assigned_to}
                                      </Badge>
                                    )}
                                    {task.priority && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          task.priority === 'High' ? 'bg-red-50 text-red-700' : 
                                          task.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 
                                          'bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        {task.priority}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={saveTasksAsEvents}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Add All Tasks to Calendar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Actions */}
            <div className="p-6 border-t bg-slate-50 space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateFollowUpTasks}
                  disabled={generatingTasks || !formData.title}
                  className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {generatingTasks ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Tasks
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copySchedulingLink}
                  className="flex-1"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              <Button
                onClick={handleSendInvites}
                disabled={sendingInvites || formData.proposed_times.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {sendingInvites ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invites
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500 text-center">
                Attendees will receive an email with proposed times
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}