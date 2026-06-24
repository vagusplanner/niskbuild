import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isToday, isPast, isFuture, startOfMonth, endOfMonth } from 'date-fns';
import { Clock, MapPin, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ListView({ currentDate, events, onEventClick }) {
  const [filter, setFilter] = useState('all'); // all, today, upcoming, past
  const [groupBy, setGroupBy] = useState('date'); // date, category
  const [sortBy, setSortBy] = useState('date'); // date, title, category
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const categoryColors = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    personal: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    health: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    prayer: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    family: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    social: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
  };

  const filterEvents = (events) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      const inMonth = eventDate >= monthStart && eventDate <= monthEnd;
      
      if (!inMonth) return false;
      
      if (filter === 'today') return isToday(eventDate);
      if (filter === 'upcoming') return isFuture(eventDate) || isToday(eventDate);
      if (filter === 'past') return isPast(eventDate) && !isToday(eventDate);
      return true;
    }).sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.start_date) - new Date(b.start_date);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'category') {
        return (a.category || 'personal').localeCompare(b.category || 'personal');
      }
      return 0;
    });
  };

  const groupEvents = (events) => {
    if (groupBy === 'date') {
      const groups = {};
      events.forEach(event => {
        const dateKey = format(new Date(event.start_date), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(event);
      });
      return groups;
    } else if (groupBy === 'category') {
      const groups = {};
      events.forEach(event => {
        const category = event.category || 'personal';
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(event);
      });
      return groups;
    }
    return { all: events };
  };

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredEvents = filterEvents(events);
  const groupedEvents = groupEvents(filteredEvents);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show:</span>
            <div className="flex gap-1">
              {['all', 'today', 'upcoming', 'past'].map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="capitalize text-xs"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="date">By Date</option>
              <option value="category">By Category</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <div className="space-y-3">
        {Object.entries(groupedEvents).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No events found</p>
          </Card>
        ) : (
          Object.entries(groupedEvents).map(([groupKey, groupEvents]) => {
            const isExpanded = expandedGroups.has(groupKey) || Object.keys(groupedEvents).length === 1;
            const groupLabel = groupBy === 'date' 
              ? format(new Date(groupKey), 'EEEE, MMMM d, yyyy')
              : groupKey.charAt(0).toUpperCase() + groupKey.slice(1);

            return (
              <Card key={groupKey} className="overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {groupLabel}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      <div className="p-2 space-y-1">
                        {groupEvents.map((event, index) => (
                          <motion.button
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onEventClick?.(event)}
                            className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                                  {event.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.is_all_day 
                                      ? 'All day' 
                                      : `${format(new Date(event.start_date), 'h:mm a')} - ${format(new Date(event.end_date), 'h:mm a')}`
                                    }
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge className={categoryColors[event.category] || categoryColors.personal}>
                                {event.category || 'personal'}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}