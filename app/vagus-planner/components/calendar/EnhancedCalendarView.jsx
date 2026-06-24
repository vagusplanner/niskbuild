import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import CalendarViewOptions from './CalendarViewOptions';
import CalendarEventFilter from './CalendarEventFilter';
import CalendarAgendaView from './CalendarAgendaView';
import { Loader2 } from 'lucide-react';

export default function EnhancedCalendarView() {
  const [viewType, setViewType] = useState('agenda');
  const [filters, setFilters] = useState({
    categories: ['work', 'personal', 'health', 'prayer', 'holiday', 'family', 'social', 'other'],
    sources: ['app', 'google', 'outlook']
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', filters],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('-start_date', 500);
      return allEvents.filter(e => {
        const categoryMatch = filters.categories.includes(e.category);
        const sourceMap = { app: 'app', google_calendar: 'google', outlook_calendar: 'outlook', none: 'app' };
        const sourceMatch = filters.sources.includes(sourceMap[e.source] || 'app');
        return categoryMatch && sourceMatch;
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* View Options & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <CalendarViewOptions viewType={viewType} onViewChange={setViewType} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filter */}
        <div className="lg:col-span-1">
          <CalendarEventFilter filters={filters} onFilterChange={setFilters} />
        </div>

        {/* Main View */}
        <div className="lg:col-span-3">
          {viewType === 'agenda' && <CalendarAgendaView events={events} />}
          {viewType === 'week' && <div className="text-slate-500 text-center py-12">Week view coming soon</div>}
          {viewType === 'month' && <div className="text-slate-500 text-center py-12">Month view coming soon</div>}
        </div>
      </div>
    </motion.div>
  );
}