import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  Tag,
  Edit,
  Trash2,
  Mail,
  CalendarClock,
  Plus,
  Sparkles,
  CheckSquare,
  FileText,
  Loader2,
  MessageCircle,
  CloudUpload,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EventChatThread from './EventChatThread';
import EventGroupChat from '../chat/EventGroupChat';
import { MessageSquare } from 'lucide-react';
import VersionHistoryButton from '@/components/versioning/VersionHistoryButton';

const categoryColors = {
  work: 'bg-blue-100 text-blue-700 border-blue-300',
  personal: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  health: 'bg-rose-100 text-rose-700 border-rose-300',
  prayer: 'bg-violet-100 text-violet-700 border-violet-300',
  holiday: 'bg-amber-100 text-amber-700 border-amber-300',
  family: 'bg-pink-100 text-pink-700 border-pink-300',
  social: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  other: 'bg-slate-100 text-slate-700 border-slate-300'
};

export default function EventDetailsModal({ event, isOpen, onClose, onEdit, onDelete, onCreateTask }) {
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [pushingToGoogle, setPushingToGoogle] = useState(false);

  // Fetch AI insights
  useEffect(() => {
    if (event && isOpen) {
      fetchAIInsights();
      fetchRelatedTasks();
    }
  }, [event, isOpen]);

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data } = await base44.functions.invoke('aiEventSummary', {
        event_id: event.id,
        event_data: event
      });
      setAiInsights(data);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchRelatedTasks = async () => {
    try {
      const tasks = await base44.entities.Task.filter({ event_id: event.id });
      setRelatedTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch related tasks:', error);
    }
  };

  const handleReschedule = () => {
    onEdit(event);
  };

  const handlePushToGoogle = async () => {
    setPushingToGoogle(true);
    try {
      const action = event.external_calendar_id ? 'update' : 'create';
      const res = await base44.functions.invoke('pushEventToGoogleCalendar', {
        event_id: event.id,
        action,
      });
      if (res.data?.status === 'skipped_google_origin') {
        toast.info('This event came from Google Calendar — no push needed.');
      } else {
        toast.success(action === 'update' ? 'Event updated in Google Calendar!' : 'Event pushed to Google Calendar!');
      }
    } catch {
      toast.error('Failed to push to Google Calendar');
    }
    setPushingToGoogle(false);
  };

  const handleSendEmail = async () => {
    if (!event.attendees || event.attendees.length === 0) {
      toast.error('No attendees to email');
      return;
    }
    
    try {
      await base44.functions.invoke('sendCalendarInvite', {
        event_id: event.id,
        recipients: event.attendees
      });
      toast.success('Email sent to attendees');
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const handleAddTask = async (taskTitle) => {
    try {
      await base44.entities.Task.create({
        title: taskTitle,
        event_id: event.id,
        due_date: event.start_date,
        category: event.category,
        status: 'todo'
      });
      toast.success('Follow-up task created');
      fetchRelatedTasks();
      setShowTaskForm(false);
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  if (!event || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
                <Badge className={cn("border", categoryColors[event.category] || categoryColors.other)}>
                  {event.category}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="text-xs sm:text-sm gap-1">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs sm:text-sm gap-1">
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs sm:text-sm gap-1">
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Chat</span>
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-slate-500">Date & Time</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    {!event.is_all_day && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(event.start_date), 'h:mm a')} - {format(new Date(event.end_date), 'h:mm a')}
                      </p>
                    )}
                    {event.is_all_day && (
                      <Badge variant="outline" className="mt-1">All Day</Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-slate-500">Description</p>
                      <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{event.description}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-slate-500">Location</p>
                      <p className="text-slate-900 dark:text-slate-100">{event.location}</p>
                    </div>
                  </div>
                )}

                {/* Reminders */}
                {event.reminders && event.reminders.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-slate-500">Reminders</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {event.reminders.map((reminder, idx) => (
                          <Badge key={idx} variant="outline">
                            {reminder.minutes_before} min before
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {event.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-slate-500">Notes</p>
                      <p className="text-slate-900 dark:text-slate-100">{event.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={handleReschedule}
              >
                <CalendarClock className="w-5 h-5 mb-1" />
                <span className="text-xs">Reschedule</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={() => setShowTaskForm(true)}
              >
                <Plus className="w-5 h-5 mb-1" />
                <span className="text-xs">Add Task</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={handleSendEmail}
              >
                <Mail className="w-5 h-5 mb-1" />
                <span className="text-xs">Send Email</span>
              </Button>
              
              <Button
               variant="outline"
               className="flex-col h-auto py-3"
               onClick={onEdit}
              >
               <Edit className="w-5 h-5 mb-1" />
               <span className="text-xs">Edit Event</span>
              </Button>

              <Button
               variant="outline"
               className="flex-col h-auto py-3"
               onClick={() => {
                 window.dispatchEvent(new CustomEvent('convert-event-to-task', { detail: event }));
                 onClose();
               }}
              >
               <CheckSquare className="w-5 h-5 mb-1" />
               <span className="text-xs">Convert to Task</span>
              </Button>
            </div>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="space-y-4">
            {/* AI Insights */}
            <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 dark:from-teal-950/20 dark:to-cyan-950/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  AI Insights & Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingInsights ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating insights...</span>
                  </div>
                ) : aiInsights ? (
                  <div className="space-y-3">
                    {/* Handle both response shapes: {summary, suggestions, preparation} and {overview, key_events, workload, advice} */}
                    {(aiInsights.summary || aiInsights.overview) && (
                      <div>
                        <p className="font-semibold text-sm text-teal-700 dark:text-teal-300 mb-1">Summary</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {typeof (aiInsights.summary || aiInsights.overview) === 'string'
                            ? (aiInsights.summary || aiInsights.overview)
                            : JSON.stringify(aiInsights.summary || aiInsights.overview)}
                        </p>
                      </div>
                    )}
                    {aiInsights.advice && (
                      <div>
                        <p className="font-semibold text-sm text-teal-700 dark:text-teal-300 mb-1">Advice</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {typeof aiInsights.advice === 'string' ? aiInsights.advice : JSON.stringify(aiInsights.advice)}
                        </p>
                      </div>
                    )}
                    {aiInsights.suggestions && Array.isArray(aiInsights.suggestions) && aiInsights.suggestions.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm text-teal-700 dark:text-teal-300 mb-2">Suggestions</p>
                        <ul className="space-y-1">
                          {aiInsights.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                              <span className="text-teal-600">•</span>
                              <span>{typeof suggestion === 'string' ? suggestion : JSON.stringify(suggestion)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiInsights.preparation && (
                      <div>
                        <p className="font-semibold text-sm text-teal-700 dark:text-teal-300 mb-1">Preparation Tips</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {typeof aiInsights.preparation === 'string' ? aiInsights.preparation : JSON.stringify(aiInsights.preparation)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No insights available for this event type.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Related Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Related Tasks ({relatedTasks.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="text-teal-600 border-teal-300"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showTaskForm && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <input
                      type="text"
                      placeholder="Task title..."
                      className="w-full px-3 py-2 border rounded-lg mb-2"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          handleAddTask(e.target.value.trim());
                          e.target.value = '';
                        }
                      }}
                    />
                    <p className="text-xs text-slate-500">Press Enter to create task</p>
                  </div>
                )}
                
                {relatedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {relatedTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={async () => {
                            await base44.entities.Task.update(task.id, {
                              status: task.status === 'completed' ? 'todo' : 'completed'
                            });
                            fetchRelatedTasks();
                          }}
                          className="w-4 h-4"
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          task.status === 'completed' && "line-through text-slate-500"
                        )}>
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {task.priority || 'medium'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No tasks linked to this event yet
                  </p>
                )}
              </CardContent>
            </Card>
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="space-y-4">
                <Button
                  onClick={() => setShowGroupChat(true)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Open Group Chat
                </Button>
                
                <div className="h-[calc(90vh-380px)]">
                  <EventChatThread 
                    event={event}
                    onCreateMeeting={(meetingData) => {
                      toast.success('Meeting created from chat!');
                      onClose();
                    }}
                    onCreateTask={(taskData) => {
                      handleAddTask(taskData.title);
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer Actions */}
          <div className="flex-none bg-slate-50 dark:bg-slate-800 border-t px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 safe-area-bottom">
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Delete this event?')) {
                  onDelete(event.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Event
            </Button>
            <div className="flex items-center gap-2">
              {event?.source !== 'google_calendar' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePushToGoogle}
                  disabled={pushingToGoogle}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
                  title="Push to Google Calendar"
                >
                  {pushingToGoogle
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : event?.is_synced && event?.external_calendar_id
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                      : <CloudUpload className="w-3.5 h-3.5" />
                  }
                  <span className="hidden sm:inline text-xs">
                    {event?.is_synced && event?.external_calendar_id ? 'Update GCal' : 'Push to Google'}
                  </span>
                </Button>
              )}
              <VersionHistoryButton entityType="Event" entityId={event?.id} />
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </motion.div>
        
        {/* Group Chat Modal */}
        <EventGroupChat
          event={event}
          isOpen={showGroupChat}
          onClose={() => setShowGroupChat(false)}
          onScheduleMeeting={(meetingData) => {
            toast.success('Meeting scheduled from chat!');
          }}
          onCreateTask={(taskData) => {
            handleAddTask(taskData.title || taskData.description);
          }}
        />
      </div>
    </AnimatePresence>
  );
}