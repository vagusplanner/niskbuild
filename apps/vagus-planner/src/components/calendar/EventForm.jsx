import React, { useState, useEffect } from 'react';
import AutoRescheduleEngine from '@/components/calendar/AutoRescheduleEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Bell, Repeat, Tag, FileText, Sparkles, Loader2, Mail, Wand2, MessageSquare, Paperclip } from 'lucide-react';
import EventFileManager from './EventFileManager';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import InviteParser from './InviteParser';
import debounce from 'lodash/debounce';
import { checkPrayerConflict } from './PrayerTimes';
import RealTimeEventEditor from '../collaboration/RealTimeEventEditor';
import EventCollaborationPanel from '../collaboration/EventCollaborationPanel';
import CollaborativeInput from '../collaboration/CollaborativeInput';
import RecurringEventForm from './RecurringEventForm';
import OptimalTimeSuggestions from './OptimalTimeSuggestions';
import RecurringExceptionManager from './RecurringExceptionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileSelectSheet from '@/components/ui/MobileSelectSheet';

const CATEGORIES = [
  { value: 'work',     label: 'Work',     color: 'bg-teal-600' },
  { value: 'personal', label: 'Personal', color: 'bg-teal-500' },
  { value: 'health',   label: 'Health',   color: 'bg-emerald-600' },
  { value: 'prayer',   label: 'Prayer',   color: 'bg-amber-500' },
  { value: 'holiday',  label: 'Holiday',  color: 'bg-amber-700' },
  { value: 'family',   label: 'Family',   color: 'bg-teal-700' },
  { value: 'social',   label: 'Social',   color: 'bg-cyan-700' },
  { value: 'other',    label: 'Other',    color: 'bg-slate-500' }
];

export default function EventForm({ isOpen, onClose, onSave, event, selectedDate, allEvents = [], settings = {} }) {
  const [showAutoReschedule, setShowAutoReschedule] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    category: 'personal',
    is_all_day: false,
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_interval: 1,
    recurrence_end_type: 'never',
    recurrence_occurrences: 10,
    recurrence_monthly_type: 'day_of_month',
    recurrence_monthly_day: 1,
    recurrence_monthly_week: 1,
    recurrence_monthly_weekday: 1,
    adjust_for_holidays: false,
    holiday_adjustment_rule: 'next_workday',
    exception_dates: [],
    custom_occurrence_dates: [],
    reminder_minutes: 30,
    location: '',
    notes: ''
  });
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [smartReminder, setSmartReminder] = useState(null);
  const [showInviteParser, setShowInviteParser] = useState(false);
  const [autoFillSuggestions, setAutoFillSuggestions] = useState(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [prayerConflict, setPrayerConflict] = useState(null);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  const queryClient = useQueryClient();

  const saveEventMutation = useMutation({
    mutationFn: (eventData) => event
      ? base44.entities.Event.update(event.id, eventData)
      : base44.entities.Event.create(eventData),
    onMutate: async (eventData) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previous = queryClient.getQueryData(['events']);
      queryClient.setQueryData(['events'], (old = []) =>
        event
          ? old.map(e => e.id === event.id ? { ...e, ...eventData } : e)
          : [{ ...eventData, id: `temp-${Date.now()}` }, ...old]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['events'], context?.previous);
      toast.error('Failed to save event');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onSuccess: (saved) => {
      onSave(saved);
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: activeEdits = [] } = useQuery({
    queryKey: ['eventEdits', event?.id],
    queryFn: () => base44.entities.EventEdit.filter({ event_id: event?.id }),
    enabled: !!event?.id,
    refetchInterval: 2000
  });

  useEffect(() => {
    if (event) {
      // Parse existing event data
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      setFormData({
        ...event,
        date: format(startDate, 'yyyy-MM-dd'),
        start_time: event.is_all_day ? '' : format(startDate, 'HH:mm'),
        end_time: event.is_all_day ? '' : format(endDate, 'HH:mm'),
        reminder_minutes: event.reminders?.[0]?.minutes_before || 30,
        recurrence_interval: event.recurrence_interval || 1,
        recurrence_end_type: event.recurrence_end_type || 'never',
        recurrence_occurrences: event.recurrence_occurrences || 10,
        recurrence_days: event.recurrence_days || [],
        recurrence_monthly_type: event.recurrence_monthly_type || 'day_of_month',
        recurrence_monthly_day: event.recurrence_monthly_day || 1,
        recurrence_monthly_week: event.recurrence_monthly_week || 1,
        recurrence_monthly_weekday: event.recurrence_monthly_weekday || 1,
        adjust_for_holidays: event.adjust_for_holidays || false,
        holiday_adjustment_rule: event.holiday_adjustment_rule || 'next_workday',
        exception_dates: event.exception_dates || [],
        custom_occurrence_dates: event.custom_occurrence_dates || []
      });
    } else if (selectedDate) {
      setFormData({
        title: '',
        description: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: '',
        end_time: '',
        category: 'personal',
        is_all_day: false,
        is_recurring: false,
        recurrence_type: 'weekly',
        recurrence_interval: 1,
        recurrence_end_type: 'never',
        recurrence_occurrences: 10,
        recurrence_days: [],
        recurrence_monthly_type: 'day_of_month',
        recurrence_monthly_day: 1,
        recurrence_monthly_week: 1,
        recurrence_monthly_weekday: 1,
        adjust_for_holidays: false,
        holiday_adjustment_rule: 'next_workday',
        exception_dates: [],
        custom_occurrence_dates: [],
        reminder_minutes: 30,
        location: '',
        notes: ''
      });
    }
  }, [event, selectedDate, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construct start_date and end_date from form fields
    const startDate = new Date(formData.date);
    if (formData.start_time && !formData.is_all_day) {
      const [hours, minutes] = formData.start_time.split(':');
      startDate.setHours(parseInt(hours), parseInt(minutes), 0);
    } else {
      startDate.setHours(0, 0, 0);
    }

    const endDate = new Date(formData.date);
    if (formData.end_time && !formData.is_all_day) {
      const [hours, minutes] = formData.end_time.split(':');
      endDate.setHours(parseInt(hours), parseInt(minutes), 0);
    } else if (formData.is_all_day) {
      endDate.setHours(23, 59, 59);
    } else {
      endDate.setHours(startDate.getHours() + 1, startDate.getMinutes(), 0);
    }

    const eventData = {
      ...formData,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      reminders: formData.reminder_minutes > 0 ? [{
        minutes_before: formData.reminder_minutes,
        type: 'notification',
        sent: false
      }] : []
    };

    // Clean up form-only fields
    delete eventData.date;
    delete eventData.start_time;
    delete eventData.end_time;
    delete eventData.reminder_minutes;
    
    // Check for conflicts before saving
    if (!event && allEvents) {
      const conflicts = checkForConflicts();
      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        setShowAutoReschedule(true);
        return;
      }
    }
    
    saveEventMutation.mutate(eventData);
  };

  const checkForConflicts = () => {
    const newStart = new Date(formData.start_date);
    const newEnd = new Date(formData.end_date);
    
    return allEvents.filter(existingEvent => {
      const existingStart = new Date(existingEvent.start_date);
      const existingEnd = new Date(existingEvent.end_date);
      
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  };

  const handleAutoReschedule = async (rescheduleData) => {
    if (rescheduleData.type === 'move_existing') {
      // Update the conflicting event
      await base44.entities.Event.update(rescheduleData.eventId, {
        start_date: rescheduleData.newStartDate,
        end_date: rescheduleData.newEndDate
      });
    }
    
    setShowAutoReschedule(false);
    saveEventMutation.mutate(formData);
  };

  // Debounced auto-fill from past events
  const debouncedAutoFill = React.useCallback(
    debounce(async (title) => {
      if (!title || title.length < 3 || event || allEvents.length === 0) return;
      
      setIsAutoFilling(true);
      try {
        // Find similar events from history
        const similarEvents = allEvents.filter(e => 
          e.title?.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(e.title?.toLowerCase().split(' ')[0] || '')
        ).slice(0, 5);

        if (similarEvents.length === 0) {
          setIsAutoFilling(false);
          return;
        }

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Based on the new event title "${title}" and these similar past events: ${JSON.stringify(similarEvents.map(e => ({
            title: e.title,
            category: e.category,
            start_time: e.start_time,
            end_time: e.end_time,
            location: e.location,
            is_recurring: e.is_recurring,
            recurrence_type: e.recurrence_type
          })))}, suggest auto-fill values:

1. Best matching category
2. Typical start time (HH:MM format)
3. Typical end time or duration
4. Common location
5. Whether it should be recurring and type
6. Calculate typical duration in minutes

Be smart about patterns - if most similar events happen at same time, suggest that time.`,
          response_json_schema: {
            type: "object",
            properties: {
              category: { type: "string" },
              start_time: { type: "string" },
              end_time: { type: "string" },
              duration_minutes: { type: "number" },
              location: { type: "string" },
              is_recurring: { type: "boolean" },
              recurrence_type: { type: "string" },
              confidence: { type: "number" },
              reasoning: { type: "string" }
            }
          }
        });

        if (result.confidence > 0.5) {
          setAutoFillSuggestions(result);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setIsAutoFilling(false);
      }
    }, 800),
    [allEvents, event]
  );

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-categorize and auto-fill when title changes
    if (field === 'title' && value && !event) {
      autoCategorize(value, formData.description);
      debouncedAutoFill(value);
    }
    
    // Auto-categorize when description changes
    if (field === 'description' && value && !event) {
      autoCategorize(formData.title, value);
    }

    // Generate smart reminder when category or location changes
    if ((field === 'category' || field === 'location') && value) {
      suggestSmartReminder();
    }

    // Check for prayer time conflict when start_time or date changes
    if ((field === 'start_time' || field === 'date') && settings?.prayer_enabled !== false) {
      const timeToCheck = field === 'start_time' ? value : formData.start_time;
      const dateToCheck = field === 'date' ? new Date(value) : new Date(formData.date);
      
      if (timeToCheck) {
        const conflict = checkPrayerConflict(timeToCheck, dateToCheck, settings);
        setPrayerConflict(conflict);
        
        if (conflict) {
          toast.warning(`This time conflicts with ${conflict.prayer} prayer at ${conflict.time}`, {
            description: 'Prayer times are reserved for 10 minutes. Consider choosing a different time.',
            duration: 5000
          });
        }
      }
    }
  };

  const applyAutoFill = () => {
    if (!autoFillSuggestions) return;
    
    const updates = {};
    if (autoFillSuggestions.category) updates.category = autoFillSuggestions.category;
    if (autoFillSuggestions.start_time) updates.start_time = autoFillSuggestions.start_time;
    if (autoFillSuggestions.end_time) updates.end_time = autoFillSuggestions.end_time;
    if (autoFillSuggestions.location) updates.location = autoFillSuggestions.location;
    if (autoFillSuggestions.is_recurring !== undefined) updates.is_recurring = autoFillSuggestions.is_recurring;
    if (autoFillSuggestions.recurrence_type) updates.recurrence_type = autoFillSuggestions.recurrence_type;
    
    setFormData(prev => ({ ...prev, ...updates }));
    setAutoFillSuggestions(null);
    toast.success('Auto-filled from similar events!');
  };

  const handleInviteParsed = (parsed) => {
    const updates = {};
    if (parsed.title) updates.title = parsed.title;
    if (parsed.date) updates.date = parsed.date;
    if (parsed.start_time) updates.start_time = parsed.start_time;
    if (parsed.end_time) updates.end_time = parsed.end_time;
    if (parsed.location) updates.location = parsed.location;
    if (parsed.description) updates.description = parsed.description;
    if (parsed.category) updates.category = parsed.category;
    if (parsed.is_recurring !== undefined) updates.is_recurring = parsed.is_recurring;
    
    setFormData(prev => ({ ...prev, ...updates }));
    setShowInviteParser(false);
    toast.success('Event details imported!');
  };

  const autoCategorize = async (title, description) => {
    if (!title || title.length < 3) return;
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this event title "${title}"${description ? ` and description "${description}"` : ''}, which category does it belong to? Categories: work, personal, health, prayer, holiday, family, social, other. Just return the category name, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" }
          }
        }
      });
      
      if (result.category && CATEGORIES.find(c => c.value === result.category)) {
        setFormData(prev => ({ ...prev, category: result.category }));
      }
    } catch (error) {
      // Silent fail
    }
  };

  const getAiSuggestions = async () => {
    if (!formData.title || formData.title.length < 3) {
      toast.error('Please enter an event title first');
      return;
    }

    setAiSuggesting(true);
    try {
      const recentEvents = allEvents.slice(0, 20).map(e => ({
        title: e.title,
        category: e.category,
        start_time: e.start_time,
        location: e.location
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the event title "${formData.title}" and these recent events: ${JSON.stringify(recentEvents)}, suggest:
        1. A typical time for this event (format HH:MM)
        2. A likely location (if applicable)
        3. Whether it should be recurring
        
        Analyze patterns in the user's past events to make smart suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_time: { type: "string" },
            suggested_location: { type: "string" },
            is_recurring: { type: "boolean" },
            explanation: { type: "string" }
          }
        }
      });

      setSuggestions(result);
      toast.success('AI suggestions ready!');
    } catch (error) {
      toast.error('Could not generate suggestions');
    } finally {
      setAiSuggesting(false);
    }
  };

  const applySuggestion = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    toast.success('Suggestion applied');
  };

  const suggestSmartReminder = async () => {
    if (!formData.category && !formData.location) return;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Given an event with category "${formData.category}", location "${formData.location || 'not specified'}", and title "${formData.title}", suggest the optimal reminder time in minutes.

Guidelines:
- Work meetings: 1 day before (1440 min) or 1 hour before (60 min) for preparation
- Family dinners/gatherings: 1 hour before (60 min)  
- Social events: 2-3 hours before for travel time
- Health appointments: 1 day before (1440 min)
- Prayer times: 5-15 minutes before
- Personal tasks: 30 minutes before
- Events with distant locations: Add extra time

Return the most appropriate reminder time in minutes and a brief reason.`,
        response_json_schema: {
          type: "object",
          properties: {
            reminder_minutes: { type: "number" },
            reason: { type: "string" },
            snooze_options: {
              type: "array",
              items: { type: "number" }
            }
          }
        }
      });

      setSmartReminder(result);
    } catch (error) {
      // Silent fail
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[105]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl max-h-[95dvh] bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-2xl z-[110] overflow-hidden flex flex-col"
          >
            {/* Drag handle — mobile only */}
            <div className="md:hidden mx-auto mt-3 mb-0 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {event ? 'Edit Event' : 'New Event'}
              </h2>
              <div className="flex items-center gap-2">
                {event && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCollabPanel(!showCollabPanel)}
                    className="h-9 border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Discuss
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-5 bg-white dark:bg-slate-900">
              {/* Real-time editing indicator */}
              {event && (
                <RealTimeEventEditor eventId={event.id}>
                  <div />
                </RealTimeEventEditor>
              )}
              {/* Import from Email/Invite */}
              {!event && (
                <div className="space-y-3">
                  {!showInviteParser ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowInviteParser(true)}
                      className="h-10 w-full border-dashed border-teal-300 text-teal-700 hover:bg-teal-50"
                      >
                      <Mail className="w-4 h-4 mr-2" />
                      Import from Email
                      </Button>
                    </div>
                  ) : (
                    <InviteParser
                      onParsed={handleInviteParsed}
                      onClose={() => setShowInviteParser(false)}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Event Title *</Label>
                  <div className="flex items-center gap-2">
                    {isAutoFilling && (
                      <span className="text-xs text-slate-400 flex items-center">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Analyzing...
                      </span>
                    )}
                    {!event && formData.title && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={getAiSuggestions}
                        disabled={aiSuggesting}
                        className="h-7 text-xs"
                      >
                        {aiSuggesting ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Suggest
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {event ? (
                  <CollaborativeInput
                    eventId={event.id}
                    field="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    activeEdits={activeEdits}
                    user={user}
                    id="title"
                    placeholder="Enter event title"
                    required
                    className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                ) : (
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter event title"
                    required
                    className="h-11"
                  />
                )}
              </div>

              {/* Auto-fill from similar events */}
              <AnimatePresence>
                {autoFillSuggestions && !event && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-semibold text-teal-900">Auto-fill from similar events</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoFillSuggestions(null)}
                        className="p-1 hover:bg-teal-100 rounded-full"
                      >
                        <X className="w-3 h-3 text-teal-600" />
                      </button>
                    </div>
                    
                    <div className="text-xs text-slate-600 space-y-1 mb-3">
                      {autoFillSuggestions.category && (
                        <p>• Category: <span className="font-medium">{autoFillSuggestions.category}</span></p>
                      )}
                      {autoFillSuggestions.start_time && (
                        <p>• Time: <span className="font-medium">{autoFillSuggestions.start_time}{autoFillSuggestions.end_time && ` - ${autoFillSuggestions.end_time}`}</span></p>
                      )}
                      {autoFillSuggestions.duration_minutes && (
                        <p>• Duration: <span className="font-medium">{autoFillSuggestions.duration_minutes >= 60 ? `${autoFillSuggestions.duration_minutes / 60}h` : `${autoFillSuggestions.duration_minutes}m`}</span></p>
                      )}
                      {autoFillSuggestions.location && (
                        <p>• Location: <span className="font-medium">{autoFillSuggestions.location}</span></p>
                      )}
                      {autoFillSuggestions.is_recurring && (
                        <p>• Recurring: <span className="font-medium">{autoFillSuggestions.recurrence_type}</span></p>
                      )}
                    </div>
                    
                    {autoFillSuggestions.reasoning && (
                      <p className="text-xs text-slate-500 italic mb-3">{autoFillSuggestions.reasoning}</p>
                    )}
                    
                    <Button
                      type="button"
                      onClick={applyAutoFill}
                      size="sm"
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      <Wand2 className="w-3 h-3 mr-2" />
                      Apply Auto-fill
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Suggestions */}
              {suggestions && !event && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-amber-50 to-teal-50 border border-amber-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">AI Suggestions</span>
                  </div>
                  
                  {suggestions.suggested_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Time: {suggestions.suggested_time}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applySuggestion('start_time', suggestions.suggested_time)}
                        className="h-7 text-xs text-amber-700"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  
                  {suggestions.suggested_location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Location: {suggestions.suggested_location}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applySuggestion('location', suggestions.suggested_location)}
                        className="h-7 text-xs text-amber-700"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  
                  {suggestions.explanation && (
                    <p className="text-xs text-slate-500 italic">{suggestions.explanation}</p>
                  )}
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    Category
                  </Label>
                  <MobileSelectSheet
                    value={formData.category}
                    onValueChange={(value) => handleChange('category', value)}
                    placeholder="Category"
                    triggerClassName="h-11"
                    options={CATEGORIES.map(cat => ({
                      value: cat.value,
                      label: cat.label,
                      content: (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                          {cat.label}
                        </div>
                      )
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <Label htmlFor="is_all_day" className="cursor-pointer">All Day Event</Label>
                <Switch
                  id="is_all_day"
                  checked={formData.is_all_day}
                  onCheckedChange={(checked) => handleChange('is_all_day', checked)}
                />
              </div>

              {!formData.is_all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Start Time
                    </Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleChange('start_time', e.target.value)}
                      className={`h-11 ${prayerConflict ? 'border-amber-400 ring-1 ring-amber-400' : ''}`}
                    />
                    {prayerConflict && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-amber-600 flex items-center gap-1"
                      >
                        <Bell className="w-3 h-3" />
                        Conflicts with {prayerConflict.prayer} ({prayerConflict.time}) - Prayer times are reserved
                      </motion.p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Add location"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Description
                </Label>
                {event ? (
                  <CollaborativeInput
                    as="textarea"
                    eventId={event.id}
                    field="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    activeEdits={activeEdits}
                    user={user}
                    id="description"
                    placeholder="Add description"
                    rows={3}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                ) : (
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Add description"
                    rows={3}
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <Label htmlFor="is_recurring" className="cursor-pointer flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-slate-400" />
                  Recurring Event
                </Label>
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => handleChange('is_recurring', checked)}
                />
              </div>

              {formData.is_recurring && (
                <>
                  <RecurringEventForm
                    recurrenceType={formData.recurrence_type}
                    recurrenceInterval={formData.recurrence_interval}
                    recurrenceEndDate={formData.recurrence_end_date}
                    recurrenceDays={formData.recurrence_days}
                    recurrenceEndType={formData.recurrence_end_type}
                    recurrenceOccurrences={formData.recurrence_occurrences}
                    recurrenceMonthlyType={formData.recurrence_monthly_type}
                    recurrenceMonthlyDay={formData.recurrence_monthly_day}
                    recurrenceMonthlyWeek={formData.recurrence_monthly_week}
                    recurrenceMonthlyWeekday={formData.recurrence_monthly_weekday}
                    adjustForHolidays={formData.adjust_for_holidays}
                    holidayAdjustmentRule={formData.holiday_adjustment_rule}
                    exceptionDates={formData.exception_dates}
                    customOccurrenceDates={formData.custom_occurrence_dates}
                    onRecurrenceChange={handleChange}
                  />

                  <RecurringExceptionManager
                    exceptionDates={formData.exception_dates || []}
                    customDates={formData.custom_occurrence_dates || []}
                    onExceptionDatesChange={(dates) => handleChange('exception_dates', dates)}
                    onCustomDatesChange={(dates) => handleChange('custom_occurrence_dates', dates)}
                  />
                </>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-400" />
                    Reminder
                  </Label>
                  {smartReminder && !event && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => applySuggestion('reminder_minutes', smartReminder.reminder_minutes)}
                      className="h-7 text-xs text-teal-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Use Smart: {smartReminder.reminder_minutes >= 1440 ? `${smartReminder.reminder_minutes / 1440}d` : smartReminder.reminder_minutes >= 60 ? `${smartReminder.reminder_minutes / 60}h` : `${smartReminder.reminder_minutes}m`}
                    </Button>
                  )}
                </div>
                <MobileSelectSheet
                  value={formData.reminder_minutes?.toString()}
                  onValueChange={(value) => handleChange('reminder_minutes', parseInt(value))}
                  placeholder="Reminder"
                  triggerClassName="h-11"
                  options={[
                    { value: '0',    label: 'No reminder' },
                    { value: '5',    label: '5 minutes before' },
                    { value: '15',   label: '15 minutes before' },
                    { value: '30',   label: '30 minutes before' },
                    { value: '60',   label: '1 hour before' },
                    { value: '120',  label: '2 hours before' },
                    { value: '180',  label: '3 hours before' },
                    { value: '1440', label: '1 day before' },
                    { value: '2880', label: '2 days before' },
                  ]}
                />
                {smartReminder && !event && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-slate-500 italic flex items-start gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{smartReminder.reason}</span>
                  </motion.p>
                )}
                </div>
                </div>

                {/* File Manager for existing events */}
            {event && (
              <div className="px-6 pb-6">
                <EventFileManager eventId={event.id} />
              </div>
            )}

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {event ? 'Update Event' : 'Create Event'}
              </Button>
            </div>

            {/* Auto-Reschedule Engine */}
            {showAutoReschedule && detectedConflicts.length > 0 && (
              <div className="absolute inset-x-0 bottom-full mb-2 px-6">
                <AutoRescheduleEngine
                  conflictingEvents={detectedConflicts}
                  newEvent={formData}
                  onReschedule={handleAutoReschedule}
                  onCancel={() => {
                    setShowAutoReschedule(false);
                    setDetectedConflicts([]);
                  }}
                />
              </div>
            )}
          </motion.div>

          {/* Collaboration Panel */}
          <AnimatePresence>
            {showCollabPanel && event && (
              <EventCollaborationPanel
                eventId={event.id}
                onClose={() => setShowCollabPanel(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}