import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Calendar, MapPin, DollarSign, Hotel, FileText, ExternalLink, Sparkles, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HolidayCollaborationPanel from '@/components/collaboration/HolidayCollaborationPanel';
import BudgetTracker from '@/components/holiday/BudgetTracker';
import BudgetInsights from '@/components/holiday/BudgetInsights';
import PersonalizedTravelInsights from '@/components/holiday/PersonalizedTravelInsights';

export default function HolidayForm({ isOpen, onClose, onSave, holiday }) {
  const queryClient = useQueryClient();

  const saveHolidayMutation = useMutation({
    mutationFn: (data) => holiday
      ? base44.entities.Holiday.update(holiday.id, data)
      : base44.entities.Holiday.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['holidays'] });
      const previous = queryClient.getQueryData(['holidays']);
      queryClient.setQueryData(['holidays'], (old = []) =>
        holiday
          ? old.map(h => h.id === holiday.id ? { ...h, ...data } : h)
          : [{ ...data, id: `temp-${Date.now()}` }, ...old]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['holidays'], context?.previous);
      toast.error('Failed to save holiday');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onSuccess: (saved) => {
      onSave(saved);
    }
  });

  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'planned',
    budget: '',
    accommodation: '',
    flight_details: '',
    notes: ''
  });

  useEffect(() => {
    if (holiday) {
      setFormData({
        ...formData,
        ...holiday,
        budget: holiday.budget?.toString() || ''
      });
    } else {
      setFormData({
        title: '',
        destination: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'planned',
        budget: '',
        accommodation: '',
        flight_details: '',
        notes: ''
      });
    }
  }, [holiday, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveHolidayMutation.mutate({
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Plane className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {holiday ? 'Edit Holiday' : 'Plan New Holiday'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {holiday ? (
              <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-4">
                  <TabsTrigger value="details">Trip Details</TabsTrigger>
                  <TabsTrigger value="budget">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Budget
                  </TabsTrigger>
                  <TabsTrigger value="collaborate">
                    <Users className="w-4 h-4 mr-2" />
                    Collaborate
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 overflow-auto mt-0">
                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Holiday Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Summer Vacation 2024"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Destination
                </Label>
                <div className="relative">
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                    placeholder="Where are you going?"
                    className="h-11"
                  />
                  {formData.destination && (
                    <a
                      href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(formData.destination)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      title="Search on Booking.com"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    Budget
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accommodation" className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-slate-400" />
                  Accommodation
                </Label>
                <Input
                  id="accommodation"
                  value={formData.accommodation}
                  onChange={(e) => handleChange('accommodation', e.target.value)}
                  placeholder="Hotel name or address"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flight_details" className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-slate-400" />
                  Flight Details
                </Label>
                <Input
                  id="flight_details"
                  value={formData.flight_details}
                  onChange={(e) => handleChange('flight_details', e.target.value)}
                  placeholder="Flight number or booking reference"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
                  </form>
                </TabsContent>

                <TabsContent value="budget" className="flex-1 overflow-auto mt-0 p-6 space-y-4">
                  <BudgetTracker holiday={holiday} />
                  <BudgetInsights holiday={holiday} />
                  <PersonalizedTravelInsights holiday={holiday} />
                </TabsContent>

                <TabsContent value="collaborate" className="flex-1 overflow-auto mt-0 p-6">
                  <HolidayCollaborationPanel holiday={holiday} />
                </TabsContent>
              </Tabs>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Holiday Name *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Summer Vacation 2024"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Destination
                  </Label>
                  <div className="relative">
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => handleChange('destination', e.target.value)}
                      placeholder="Where are you going?"
                      className="h-11"
                    />
                    {formData.destination && (
                      <a
                        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(formData.destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        title="Search on Booking.com"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Start Date *
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange('status', value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      Budget
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => handleChange('budget', e.target.value)}
                      placeholder="0.00"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accommodation" className="flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-slate-400" />
                    Accommodation
                  </Label>
                  <Input
                    id="accommodation"
                    value={formData.accommodation}
                    onChange={(e) => handleChange('accommodation', e.target.value)}
                    placeholder="Hotel name or address"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flight_details" className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-slate-400" />
                    Flight Details
                  </Label>
                  <Input
                    id="flight_details"
                    value={formData.flight_details}
                    onChange={(e) => handleChange('flight_details', e.target.value)}
                    placeholder="Flight number or booking reference"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </form>
            )}

            <div className="p-6 border-t bg-slate-50 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {holiday ? 'Update Holiday' : 'Save Holiday'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}