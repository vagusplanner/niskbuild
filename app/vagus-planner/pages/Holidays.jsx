import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Plane, Map, Calendar, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import HolidayCard from '@/components/calendar/HolidayCard';
import HolidayForm from '@/components/calendar/HolidayForm';
import ItineraryImporter from '@/components/holiday/ItineraryImporter';
import TravelAlertsPanel from '@/components/holiday/TravelAlertsPanel';
import ShareHolidayModal from '@/components/collaboration/ShareHolidayModal';
import AITripPlanner from '@/components/holiday/AITripPlanner';
import UnifiedHolidayAIPanel from '@/components/assistant/UnifiedHolidayAIPanel';
import AIBusinessInsights from '@/components/analytics/AIBusinessInsights';

export default function HolidaysPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingHoliday, setSharingHoliday] = useState(null);
  const [showTripPlanner, setShowTripPlanner] = useState(false);

  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-start_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowForm(false);
      setEditingHoliday(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowForm(false);
      setEditingHoliday(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    }
  });

  const handleSave = async (data) => {
    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data });
    } else {
      // Create holiday and auto-block calendar
      createMutation.mutate(data);
      
      // Auto-create calendar event for the trip
      try {
        await base44.entities.Event.create({
          title: `🏖️ ${data.title}`,
          description: data.notes || `Trip to ${data.destination}`,
          date: data.start_date,
          start_time: '00:00',
          end_time: '23:59',
          is_all_day: true,
          category: 'holiday',
          location: data.destination,
          notes: `Budget: $${data.budget || 0}\nAccommodation: ${data.accommodation || 'TBD'}\nFlight: ${data.flight_details || 'TBD'}`
        });
      } catch (error) {
        console.error('Failed to create calendar event:', error);
      }
    }
  };

  const handleItineraryImport = async (itinerary) => {
    const holidayData = {
      title: itinerary.title,
      destination: itinerary.destination,
      start_date: itinerary.start_date,
      end_date: itinerary.end_date,
      status: 'booked',
      accommodation: itinerary.accommodation || '',
      flight_details: itinerary.flight_details || '',
      notes: `${itinerary.details || ''}\nConfirmation: ${itinerary.confirmation || ''}\nImported from email`
    };

    createMutation.mutate(holidayData);

    // Auto-create calendar event
    try {
      await base44.entities.Event.create({
        title: `🏖️ ${itinerary.title}`,
        description: itinerary.details || '',
        date: itinerary.start_date,
        start_time: '00:00',
        end_time: '23:59',
        is_all_day: true,
        category: 'holiday',
        location: itinerary.destination,
        notes: `Confirmation: ${itinerary.confirmation || 'N/A'}\n${itinerary.accommodation || ''}\n${itinerary.flight_details || ''}`
      });
    } catch (error) {
      console.error('Failed to create calendar event:', error);
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleShare = (holiday) => {
    setSharingHoliday(holiday);
    setShareModalOpen(true);
  };

  const filteredHolidays = holidays.filter(holiday => {
    const matchesFilter = filter === 'all' || holiday.status === filter;
    const matchesSearch = !searchQuery || 
      holiday.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holiday.destination?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcomingCount = holidays.filter(h => 
    h.status === 'planned' || h.status === 'booked'
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
              <Plane className="w-8 h-8 text-teal-600" />
              My Holidays
            </h1>
            <p className="text-slate-500 mt-1">
              {upcomingCount} upcoming trip{upcomingCount !== 1 ? 's' : ''} planned
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTripPlanner(true)}
              className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"
            >
              <Plane className="w-5 h-5 mr-2" />
              AI Trip Planner
            </Button>
            <Button
              onClick={() => {
                setEditingHoliday(null);
                setShowForm(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Manual Plan
            </Button>
          </div>
        </motion.div>

        {/* Unified Holiday AI Assistant */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <UnifiedHolidayAIPanel onCreateHoliday={handleSave} />
        </motion.div>

        {/* AI Business Insights */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <AIBusinessInsights section="holidays" />
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Planned', value: holidays.filter(h => h.status === 'planned').length, color: 'bg-slate-100 text-slate-700' },
            { label: 'Booked', value: holidays.filter(h => h.status === 'booked').length, color: 'bg-teal-100 text-teal-700' },
            { label: 'Completed', value: holidays.filter(h => h.status === 'completed').length, color: 'bg-blue-100 text-blue-700' },
            { label: 'Total Budget', value: `$${holidays.reduce((sum, h) => sum + (h.budget || 0), 0).toLocaleString()}`, color: 'bg-teal-100 text-teal-700' }
          ].map((stat, i) => (
            <Card key={stat.label} className={`p-4 ${stat.color} border-0`}>
              <p className="text-sm opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white"
            />
          </div>
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <TabsList className="bg-white h-11">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="planned">Planned</TabsTrigger>
              <TabsTrigger value="booked">Booked</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Itinerary Importer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <ItineraryImporter onItineraryImported={handleItineraryImport} />
        </motion.div>

        {/* Travel Alerts for Active Trips */}
        {holidays.some(h => h.status === 'booked' || h.status === 'in_progress') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            {holidays
              .filter(h => h.status === 'booked' || h.status === 'in_progress')
              .map(holiday => (
                <TravelAlertsPanel key={holiday.id} holiday={holiday} />
              ))}
          </motion.div>
        )}

        {/* Holidays List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : filteredHolidays.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredHolidays.map((holiday, index) => (
                <HolidayCard
                  key={holiday.id}
                  holiday={holiday}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="p-12 text-center bg-white/50 border-dashed border-2">
              <Map className="w-16 h-16 text-teal-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {searchQuery ? 'No holidays found' : 'No holidays planned yet'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchQuery 
                  ? 'Try adjusting your search or filters'
                  : 'Start planning your next adventure!'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => {
                    setEditingHoliday(null);
                    setShowForm(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Plan Your First Holiday
                </Button>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      {/* Holiday Form Modal */}
      <HolidayForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingHoliday(null);
        }}
        onSave={handleSave}
        holiday={editingHoliday}
      />

      {/* Share Holiday Modal */}
      <ShareHolidayModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setSharingHoliday(null);
        }}
        holiday={sharingHoliday}
      />

      {/* AI Trip Planner */}
      <AITripPlanner
        open={showTripPlanner}
        onClose={() => setShowTripPlanner(false)}
      />
    </div>
  );
}