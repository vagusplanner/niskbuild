import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, Loader2, Sparkles, Calendar, 
  Clock, Users, AlertTriangle, CheckCircle, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { format, parseISO, addMinutes } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export default function MeetingAssistant({ 
  events = [], 
  meetings = [],
  onUpdateForm, 
  formData,
  onAddTimeSlot,
  onAddAttendee 
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I can help you schedule this meeting. Try saying things like:\n- \"Schedule for tomorrow at 2pm\"\n- \"Find a 1-hour slot next week\"\n- \"Add john@company.com as attendee\"\n- \"Check for conflicts with my calendar\"\n- \"Reschedule to Friday afternoon\""
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectConflicts = (proposedSlots) => {
    const foundConflicts = [];
    
    proposedSlots.forEach(slot => {
      const slotDate = slot.date;
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;
      
      events.forEach(event => {
        if (event.date === slotDate && event.start_time && event.end_time) {
          // Check for overlap
          if (
            (slotStart >= event.start_time && slotStart < event.end_time) ||
            (slotEnd > event.start_time && slotEnd <= event.end_time) ||
            (slotStart <= event.start_time && slotEnd >= event.end_time)
          ) {
            foundConflicts.push({
              slot,
              conflictsWith: event.title,
              eventTime: `${event.start_time} - ${event.end_time}`
            });
          }
        }
      });
    });
    
    return foundConflicts;
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsProcessing(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const upcomingEvents = events
        .filter(e => new Date(e.date) >= new Date())
        .slice(0, 30)
        .map(e => ({
          date: e.date,
          start_time: e.start_time,
          end_time: e.end_time,
          title: e.title
        }));

      const pendingMeetings = meetings
        .filter(m => m.status === 'pending')
        .map(m => ({
          title: m.title,
          proposed_times: m.proposed_times,
          attendees: m.attendees
        }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI meeting scheduling assistant. Parse the user's natural language request and help them schedule a meeting.

CURRENT MEETING FORM DATA:
- Title: ${formData.title || '(not set)'}
- Duration: ${formData.duration_minutes} minutes
- Attendees: ${formData.attendees?.join(', ') || 'none'}
- Current proposed times: ${JSON.stringify(formData.proposed_times || [])}
- Location: ${formData.location || '(not set)'}
- Description/Agenda: ${formData.description || '(not set)'}

TODAY'S DATE: ${today}

USER'S UPCOMING EVENTS (for conflict checking):
${JSON.stringify(upcomingEvents, null, 2)}

PENDING MEETINGS:
${JSON.stringify(pendingMeetings, null, 2)}

PAST MEETINGS (for attendee patterns):
${JSON.stringify(meetings.slice(0, 10).map(m => ({ title: m.title, attendees: m.attendees })), null, 2)}

USER REQUEST: "${userMessage}"

Analyze the request and respond with appropriate actions. You can:
1. PROPOSE_TIME - Suggest specific meeting times
2. ADD_ATTENDEE - Add email addresses (suggest relevant attendees based on past meetings if user asks)
3. UPDATE_FORM - Update title, duration, location, or generate agenda
4. GENERATE_AGENDA - Generate a structured meeting agenda if requested
5. SUGGEST_ATTENDEES - Suggest relevant attendees based on meeting topic and past patterns
6. CHECK_CONFLICTS - Analyze proposed times for conflicts
7. RESCHEDULE - Suggest alternative times if there are conflicts
8. RESPOND - Just provide a text response

If user asks for agenda generation or attendee suggestions, tell them the Meeting Scheduler has dedicated AI features for that (they can scroll down to see AI Meeting Assistant buttons).

Return a structured response with actions and a friendly message.`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  data: { type: "object" }
                }
              }
            },
            conflicts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposed_time: { type: "string" },
                  conflicts_with: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Process actions
      if (result.actions) {
        for (const action of result.actions) {
          switch (action.type) {
            case 'PROPOSE_TIME':
              if (action.data?.date && action.data?.start_time) {
                const endTime = action.data.end_time || calculateEndTime(
                  action.data.start_time, 
                  formData.duration_minutes
                );
                onAddTimeSlot({
                  date: action.data.date,
                  start_time: action.data.start_time,
                  end_time: endTime
                });
              }
              break;
            case 'ADD_ATTENDEE':
              if (action.data?.email) {
                onAddAttendee(action.data.email);
              }
              break;
            case 'UPDATE_FORM':
              if (action.data) {
                onUpdateForm(action.data);
              }
              break;
          }
        }
      }

      // Handle conflicts
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.message,
        conflicts: result.conflicts
      }]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I had trouble processing that. Could you try rephrasing?" 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, 'HH:mm');
  };

  const quickActions = [
    "Schedule for tomorrow at 10am",
    "Find free slots this week",
    "Add my team members"
  ];

  return (
    <div className="border rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">AI Scheduling Assistant</span>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-auto p-3 space-y-3">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] p-2.5 rounded-xl text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white text-slate-700 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
              
              {/* Conflict warnings */}
              {msg.conflicts && msg.conflicts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.conflicts.map((conflict, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 font-medium">
                          Conflict: {conflict.conflicts_with}
                        </p>
                        {conflict.suggestion && (
                          <p className="text-amber-600">{conflict.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white p-2.5 rounded-xl rounded-bl-sm shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setInput(action)}
                className="text-xs px-2 py-1 bg-white/80 hover:bg-white rounded-full text-purple-700 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-white/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: 'Schedule for Friday at 3pm'"
            className="flex-1 text-sm h-9 bg-white"
            disabled={isProcessing}
          />
          <Button
            type="submit"
            disabled={isProcessing || !input.trim()}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 h-9"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}