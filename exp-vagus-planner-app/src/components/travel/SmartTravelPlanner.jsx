import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plane, MapPin, Calendar, Clock, Luggage, Sparkles, 
  Mail, Loader2, Check, X, ChevronRight, Moon
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function SmartTravelPlanner({ isOpen, onClose, selectedDate }) {
  const [tripData, setTripData] = useState({
    destination: '',
    start_date: selectedDate || new Date().toISOString().split('T')[0],
    end_date: addDays(new Date(selectedDate || new Date()), 7).toISOString().split('T')[0]
  });
  const [scanningEmail, setScanningEmail] = useState(false);
  const [suggestedDestinations, setSuggestedDestinations] = useState([]);
  const [packingList, setPackingList] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await SDK.entities.UserSettings.list();
      return list[0] || null;
    }
  });

  const { data: emailBookings, refetch: scanEmails } = useQuery({
    queryKey: ['emailBookings'],
    queryFn: async () => {
      setScanningEmail(true);
      try {
        const result = await SDK.functions.invoke('scanTravelBookings', {});
        return result.data?.bookings || [];
      } finally {
        setScanningEmail(false);
      }
    },
    enabled: false
  });

  const handleScanEmails = async () => {
    toast.loading('Scanning your emails for travel bookings...', { id: 'scan' });
    await scanEmails();
    toast.success('Email scan complete!', { id: 'scan' });
  };

  const handleGetSuggestions = async () => {
    if (!settings?.travel_interests || settings.travel_interests.length === 0) {
      toast.error('Please set your travel interests in Settings first');
      return;
    }

    toast.loading('Getting AI destination suggestions...', { id: 'suggest' });
    try {
      const result = await SDK.functions.invoke('suggestTravelDestinations', {
        interests: settings.travel_interests,
        budget: tripData.budget,
        duration_days: Math.ceil((new Date(tripData.end_date) - new Date(tripData.start_date)) / (1000 * 60 * 60 * 24))
      });
      setSuggestedDestinations(result.data?.destinations || []);
      toast.success('Destinations suggested!', { id: 'suggest' });
    } catch (error) {
      toast.error('Failed to get suggestions', { id: 'suggest' });
    }
  };

  const handleGeneratePackingList = async () => {
    if (!tripData.destination) {
      toast.error('Please enter a destination first');
      return;
    }

    toast.loading('Generating smart packing list...', { id: 'packing' });
    try {
      const result = await SDK.functions.invoke('generatePackingList', {
        destination: tripData.destination,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        activities: tripData.activities || []
      });
      setPackingList(result.data?.items || []);
      toast.success('Packing list ready!', { id: 'packing' });
    } catch (error) {
      toast.error('Failed to generate packing list', { id: 'packing' });
    }
  };

  const createTripMutation = useMutation({
    mutationFn: async (data) => {
      // Create the holiday
      const holiday = await SDK.entities.Holiday.create({
        title: `Trip to ${data.destination}`,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'planned',
        notes: data.notes
      });

      // Auto-adjust prayer times for destination
      await SDK.functions.invoke('adjustPrayerTimesForTravel', {
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date
      });

      // Create calendar events for each itinerary item
      if (itinerary.length > 0) {
        for (const item of itinerary) {
          await SDK.entities.Event.create({
            title: item.activity,
            description: item.notes,
            start_date: `${item.date}T${item.time}:00`,
            end_date: `${item.date}T${item.end_time || item.time}:00`,
            location: item.location || data.destination,
            category: 'holiday',
            is_all_day: false
          });
        }
      }

      return holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Trip created and added to calendar! 🌍');
      onClose();
    }
  });

  const handleCreateTrip = () => {
    createTripMutation.mutate(tripData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Smart Travel Planner</h2>
                  <p className="text-teal-100 text-sm">AI-powered trip planning & calendar integration</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Trip Details</TabsTrigger>
                <TabsTrigger value="email">Email Import</TabsTrigger>
                <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
                <TabsTrigger value="packing">Packing List</TabsTrigger>
              </TabsList>

              {/* Trip Details */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      value={tripData.destination}
                      onChange={(e) => setTripData({ ...tripData, destination: e.target.value })}
                      placeholder="e.g., Maldives, Paris, Tokyo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={tripData.start_date}
                      onChange={(e) => setTripData({ ...tripData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={tripData.end_date}
                      onChange={(e) => setTripData({ ...tripData, end_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (optional)</Label>
                    <Input
                      type="number"
                      value={tripData.budget || ''}
                      onChange={(e) => setTripData({ ...tripData, budget: e.target.value })}
                      placeholder="USD"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={tripData.notes || ''}
                    onChange={(e) => setTripData({ ...tripData, notes: e.target.value })}
                    placeholder="Any special notes about this trip..."
                  />
                </div>

                {/* Itinerary Builder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      Itinerary (will be added to calendar)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={() => setItinerary([...itinerary, { date: tripData.start_date, time: '09:00', activity: '', location: '' }])}
                      className="w-full"
                    >
                      + Add Activity
                    </Button>
                    <div className="space-y-3 mt-4">
                      {itinerary.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg">
                          <Input
                            type="date"
                            className="col-span-3"
                            value={item.date}
                            onChange={(e) => {
                              const newItinerary = [...itinerary];
                              newItinerary[idx].date = e.target.value;
                              setItinerary(newItinerary);
                            }}
                          />
                          <Input
                            type="time"
                            className="col-span-2"
                            value={item.time}
                            onChange={(e) => {
                              const newItinerary = [...itinerary];
                              newItinerary[idx].time = e.target.value;
                              setItinerary(newItinerary);
                            }}
                          />
                          <Input
                            className="col-span-4"
                            placeholder="Activity"
                            value={item.activity}
                            onChange={(e) => {
                              const newItinerary = [...itinerary];
                              newItinerary[idx].activity = e.target.value;
                              setItinerary(newItinerary);
                            }}
                          />
                          <Input
                            className="col-span-2"
                            placeholder="Location"
                            value={item.location}
                            onChange={(e) => {
                              const newItinerary = [...itinerary];
                              newItinerary[idx].location = e.target.value;
                              setItinerary(newItinerary);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="col-span-1"
                            onClick={() => setItinerary(itinerary.filter((_, i) => i !== idx))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Prayer Time Adjustment Notice */}
                {tripData.destination && (
                  <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                    <CardContent className="p-4 flex items-start gap-3">
                      <Moon className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-900">Prayer Times Auto-Adjustment</p>
                        <p className="text-sm text-purple-700 mt-1">
                          Prayer times will be automatically adjusted for {tripData.destination} during your trip dates
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleCreateTrip}
                  disabled={!tripData.destination || createTripMutation.isPending}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  {createTripMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  Create Trip & Add to Calendar
                </Button>
              </TabsContent>

              {/* Email Import */}
              <TabsContent value="email" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Import Bookings from Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      We'll scan your Gmail for flight, hotel, and activity bookings and import them automatically.
                    </p>
                    <Button onClick={handleScanEmails} disabled={scanningEmail} className="w-full">
                      {scanningEmail ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-5 h-5 mr-2" />
                      )}
                      Scan My Emails
                    </Button>

                    {emailBookings && emailBookings.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {emailBookings.map((booking, idx) => (
                          <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-slate-800">{booking.type}</p>
                                <p className="text-sm text-slate-600 mt-1">{booking.details}</p>
                                <p className="text-xs text-slate-500 mt-2">
                                  {booking.date} • {booking.confirmation}
                                </p>
                              </div>
                              <Button size="sm" variant="outline">
                                Import
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Suggestions */}
              <TabsContent value="suggestions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      AI Destination Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Based on your interests: {settings?.travel_interests?.join(', ') || 'None set'}
                    </p>
                    <Button onClick={handleGetSuggestions} className="w-full">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Get AI Suggestions
                    </Button>

                    {suggestedDestinations.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {suggestedDestinations.map((dest, idx) => (
                          <Card key={idx} className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-lg">{dest.name}</p>
                                  <p className="text-sm text-slate-600 mt-1">{dest.reason}</p>
                                  <div className="flex gap-2 mt-2">
                                    <Badge>{dest.best_time}</Badge>
                                    <Badge variant="outline">{dest.budget_level}</Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => setTripData({ ...tripData, destination: dest.name })}
                                >
                                  Select
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Packing List */}
              <TabsContent value="packing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Luggage className="w-5 h-5 text-teal-600" />
                      Smart Packing List Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      AI-generated packing list based on destination, weather, and trip duration
                    </p>
                    <Button onClick={handleGeneratePackingList} disabled={!tripData.destination} className="w-full">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Packing List
                    </Button>

                    {packingList.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {Object.entries(
                          packingList.reduce((acc, item) => {
                            if (!acc[item.category]) acc[item.category] = [];
                            acc[item.category].push(item);
                            return acc;
                          }, {})
                        ).map(([category, items]) => (
                          <div key={category}>
                            <p className="font-semibold text-slate-700 mb-2">{category}</p>
                            <div className="grid gap-2">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                  <input type="checkbox" className="w-4 h-4" />
                                  <span className="text-sm">{item.name}</span>
                                  {item.quantity && (
                                    <Badge variant="outline" className="ml-auto">x{item.quantity}</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}