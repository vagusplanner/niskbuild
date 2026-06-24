import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, Moon, AlertCircle, Calendar, MapPin, 
  TrendingUp, Lightbulb, CheckCircle2, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInMinutes, addMinutes, isBefore, isAfter } from 'date-fns';

export default function CalendarAwareAssistant({ onSuggestionClick }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  // Generate smart suggestions based on calendar events
  useEffect(() => {
    if (!events.length || !userSettings) return;

    const now = new Date();
    const newSuggestions = [];

    // Sort events by start time - with null checks
    const upcomingEvents = events
      .filter(event => {
        if (!event.start_date) return false;
        try {
          const startDate = parseISO(event.start_date);
          return isAfter(startDate, now);
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return parseISO(a.start_date) - parseISO(b.start_date);
        } catch {
          return 0;
        }
      })
      .slice(0, 5);

    upcomingEvents.forEach((event, index) => {
      if (!event.start_date) return;
      
      let startDate;
      try {
        startDate = parseISO(event.start_date);
      } catch {
        return;
      }
      
      const minutesUntil = differenceInMinutes(startDate, now);

      // Prayer time reminder before meetings
      if (userSettings.prayer_enabled && minutesUntil > 15 && minutesUntil < 120) {
        const eventHour = startDate.getHours();
        let prayerSuggestion = null;

        // Check if there's a prayer time before the meeting
        if (eventHour >= 12 && eventHour < 16) {
          prayerSuggestion = {
            id: `prayer-${event.id}`,
            type: 'prayer',
            icon: Moon,
            color: 'from-teal-500 to-cyan-600',
            priority: 'high',
            title: 'Prayer Time Before Meeting',
            message: `You have "${event.title}" at ${format(startDate, 'h:mm a')}. Consider praying Dhuhr before your meeting.`,
            action: 'View Prayer Times',
            actionType: 'navigate',
            actionData: { page: 'Islamic' }
          };
        } else if (eventHour >= 16 && eventHour < 19) {
          prayerSuggestion = {
            id: `prayer-${event.id}`,
            type: 'prayer',
            icon: Moon,
            color: 'from-purple-500 to-indigo-600',
            priority: 'high',
            title: 'Prayer Time Before Meeting',
            message: `You have "${event.title}" at ${format(startDate, 'h:mm a')}. Don't forget to pray Asr beforehand.`,
            action: 'View Prayer Times',
            actionType: 'navigate',
            actionData: { page: 'Islamic' }
          };
        }

        if (prayerSuggestion) {
          newSuggestions.push(prayerSuggestion);
        }
      }

      // Travel time suggestion for events with location
      if (event.location && minutesUntil > 10 && minutesUntil < 60) {
        newSuggestions.push({
          id: `travel-${event.id}`,
          type: 'travel',
          icon: MapPin,
          color: 'from-blue-500 to-indigo-600',
          priority: 'medium',
          title: 'Consider Travel Time',
          message: `"${event.title}" is at ${event.location}. Check traffic and leave with extra time.`,
          action: 'Get Directions',
          actionType: 'external',
          actionData: { url: `https://maps.google.com/?q=${encodeURIComponent(event.location)}` }
        });
      }

      // Preparation reminder for important meetings
      if (event.category === 'work' && minutesUntil > 30 && minutesUntil < 90) {
        newSuggestions.push({
          id: `prep-${event.id}`,
          type: 'preparation',
          icon: TrendingUp,
          color: 'from-amber-500 to-orange-600',
          priority: 'medium',
          title: 'Meeting Preparation',
          message: `"${event.title}" starts soon. Review your notes and prepare any materials needed.`,
          action: 'View Event',
          actionType: 'event',
          actionData: { event }
        });
      }

      // Break reminder for back-to-back meetings
      if (index < upcomingEvents.length - 1) {
        const nextEvent = upcomingEvents[index + 1];
        const endDate = parseISO(event.end_date);
        const nextStartDate = parseISO(nextEvent.start_date);
        const gapMinutes = differenceInMinutes(nextStartDate, endDate);

        if (gapMinutes < 15 && minutesUntil < 120) {
          newSuggestions.push({
            id: `break-${event.id}`,
            type: 'wellness',
            icon: Clock,
            color: 'from-green-500 to-emerald-600',
            priority: 'low',
            title: 'Back-to-Back Meetings',
            message: `You have only ${gapMinutes} minutes between "${event.title}" and "${nextEvent.title}". Consider a quick stretch.`,
            action: 'View Schedule',
            actionType: 'navigate',
            actionData: { page: 'Calendar' }
          });
        }
      }
    });

    // Filter out dismissed suggestions
    const filteredSuggestions = newSuggestions.filter(
      s => !dismissedIds.includes(s.id)
    );

    setSuggestions(filteredSuggestions.slice(0, 3)); // Limit to 3 suggestions
  }, [events, userSettings, dismissedIds]);

  const handleDismiss = (id) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleAction = (suggestion) => {
    handleDismiss(suggestion.id);
    
    setTimeout(() => {
      if (suggestion.actionType === 'navigate' && onSuggestionClick) {
        onSuggestionClick(suggestion.actionData.page);
      } else if (suggestion.actionType === 'external') {
        window.open(suggestion.actionData.url, '_blank');
      } else if (suggestion.actionType === 'event' && onSuggestionClick) {
        onSuggestionClick('event-detail', suggestion.actionData.event);
      }
    }, 300);
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 lg:bottom-6 lg:left-80 z-[60] max-w-sm">
      <AnimatePresence>
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="mb-3"
            >
              <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden`}>
                <div className={`h-1 bg-gradient-to-r ${suggestion.color}`} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${suggestion.color} flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800 text-sm">
                          {suggestion.title}
                        </h4>
                        <button
                          onClick={() => handleDismiss(suggestion.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        {suggestion.message}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleAction(suggestion)}
                        className={`text-xs h-7 bg-gradient-to-r ${suggestion.color} hover:opacity-90`}
                      >
                        {suggestion.action}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}