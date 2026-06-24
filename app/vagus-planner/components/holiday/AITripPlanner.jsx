import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Loader2, MapPin, DollarSign, Calendar, 
  Plane, Hotel, UtensilsCrossed, TrendingUp, ExternalLink,
  CheckCircle2, Clock, Star, ArrowRight, Plus, X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import AIContentAssistant from '@/components/assistant/AIContentAssistant';
import EnhancedTravelPlanner from '@/components/holiday/EnhancedTravelPlanner';

export default function AITripPlanner({ open, onClose }) {
  const [step, setStep] = useState(1); // 1: preferences, 2: destinations, 3: itinerary, 4: enhanced
  const [preferences, setPreferences] = useState({
    budget: '',
    duration: '7',
    start_date: '',
    style: 'balanced',
    travelers: 1
  });
  const [destinations, setDestinations] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [packingList, setPackingList] = useState(null);
  const [showPacking, setShowPacking] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [tripNotes, setTripNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const createHolidayMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday created! You can now customize and book.');
      onClose();
    }
  });

  const suggestDestinations = async () => {
    if (!preferences.budget || !preferences.duration) {
      toast.error('Please fill in budget and duration');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generatePersonalizedTripSuggestions', {
        budget: parseInt(preferences.budget),
        duration_days: parseInt(preferences.duration),
        travel_style: preferences.style
      });
      setDestinations(data.suggestions);
      setStep(2);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const generateItinerary = async (destination) => {
    setSelectedDestination(destination);
    setStep(4); // Go directly to enhanced planner
  };

  const generatePackingList = async () => {
    if (!selectedDestination || !preferences.start_date) {
      toast.error('Missing trip details');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateSmartPackingList', {
        destination: selectedDestination.destination,
        duration_days: parseInt(preferences.duration),
        activities: selectedDestination.activities || [],
        start_date: preferences.start_date
      });
      setPackingList(data.packing_list);
      setShowPacking(true);
    } catch (error) {
      toast.error('Failed to generate packing list');
    } finally {
      setLoading(false);
    }
  };

  const saveAsHoliday = () => {
    if (!itinerary || !selectedDestination) return;

    const endDate = new Date(preferences.start_date);
    endDate.setDate(endDate.getDate() + parseInt(preferences.duration));

    createHolidayMutation.mutate({
      title: `Trip to ${selectedDestination.destination}`,
      destination: selectedDestination.destination,
      start_date: preferences.start_date,
      end_date: format(endDate, 'yyyy-MM-dd'),
      budget: itinerary.cost_summary.total,
      status: 'planned',
      notes: `AI-generated itinerary:\n\nFlights: $${itinerary.cost_summary.flights}\nAccommodation: $${itinerary.cost_summary.accommodation}\nActivities: $${itinerary.cost_summary.activities}\n\nDaily plan included.`,
      package_booking: {
        flight_url: itinerary.flights[0]?.booking_url || '',
        hotel_url: itinerary.accommodations[0]?.booking_url || '',
        total_cost: itinerary.cost_summary.total
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto safe-area-padding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Trip Planner
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Preferences */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget (USD)</Label>
                <Input
                  type="number"
                  placeholder="3000"
                  value={preferences.budget}
                  onChange={(e) => setPreferences({ ...preferences, budget: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  placeholder="7"
                  value={preferences.duration}
                  onChange={(e) => setPreferences({ ...preferences, duration: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={preferences.start_date}
                  onChange={(e) => setPreferences({ ...preferences, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Travelers</Label>
                <Input
                  type="number"
                  min="1"
                  value={preferences.travelers}
                  onChange={(e) => setPreferences({ ...preferences, travelers: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Travel Style</Label>
              <Select value={preferences.style} onValueChange={(v) => setPreferences({ ...preferences, style: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="luxury">Luxury & Comfort</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="budget">Budget-Friendly</SelectItem>
                  <SelectItem value="adventure">Adventure & Active</SelectItem>
                  <SelectItem value="relaxation">Relaxation & Leisure</SelectItem>
                  <SelectItem value="hajj">Hajj Pilgrimage</SelectItem>
                  <SelectItem value="umrah">Umrah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIAssistant(true)}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Help
              </Button>
              <Button onClick={suggestDestinations} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Suggest
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Destination Selection */}
        {step === 2 && destinations && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
            <Button variant="outline" onClick={() => setStep(1)} size="sm">← Back</Button>
            
            <div className="space-y-4">
              {destinations.map((dest, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="p-4 hover:border-purple-300 transition-all cursor-pointer" onClick={() => generateItinerary(dest)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800">{dest.destination}</h4>
                          <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0">
                            {dest.match_score}% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{dest.why_perfect}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-slate-600">Total Budget</p>
                        <p className="text-lg font-bold text-green-700">${dest.budget_breakdown.total}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-slate-600">Best Time</p>
                        <p className="text-sm font-medium text-blue-700">{dest.best_time}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Must-Do Activities:</p>
                      <div className="flex flex-wrap gap-1">
                        {dest.activities?.slice(0, 5).map((activity, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{activity}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Hidden Gems:</p>
                      <div className="space-y-0.5">
                        {dest.hidden_gems?.slice(0, 3).map((gem, i) => (
                          <p key={i} className="text-xs text-slate-600">• {gem}</p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-end">
                      <span className="text-sm text-purple-600 flex items-center gap-1 font-medium">
                        Generate Detailed Itinerary <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-slate-600">Generating your perfect itinerary...</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Enhanced Travel Planner */}
        {step === 4 && selectedDestination && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
            <Button variant="outline" onClick={() => setStep(2)} size="sm" className="mb-4">← Back</Button>
            <EnhancedTravelPlanner
              destination={selectedDestination.destination}
              budget={parseInt(preferences.budget)}
              duration={parseInt(preferences.duration)}
              startDate={preferences.start_date}
              onComplete={(tripData) => {
                const endDate = new Date(preferences.start_date);
                endDate.setDate(endDate.getDate() + parseInt(preferences.duration));

                createHolidayMutation.mutate({
                  title: `Trip to ${selectedDestination.destination}`,
                  destination: selectedDestination.destination,
                  start_date: preferences.start_date,
                  end_date: format(endDate, 'yyyy-MM-dd'),
                  budget: tripData.activities.reduce((sum, a) => sum + a.cost, 0) + (tripData.accommodation?.total_cost || 0),
                  status: 'planned',
                  accommodation: tripData.accommodation?.name || '',
                  notes: `Selected ${tripData.activities.length} activities. ${tripData.accommodation ? `Staying at ${tripData.accommodation.name}` : ''}`,
                  package_booking: {
                    total_cost: tripData.activities.reduce((sum, a) => sum + a.cost, 0) + (tripData.accommodation?.total_cost || 0)
                  }
                });
              }}
            />
          </motion.div>
        )}

        {/* Step 3: Itinerary (Legacy) */}
        {step === 3 && itinerary && selectedDestination && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)} size="sm">← Back</Button>
              <h3 className="font-semibold text-lg">{selectedDestination.destination}</h3>
              <div className="flex gap-2">
                <Button onClick={generatePackingList} variant="outline" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Packing List
                </Button>
                <Button onClick={saveAsHoliday} className="bg-green-600 hover:bg-green-700" disabled={createHolidayMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Trip
                </Button>
              </div>
            </div>

            {/* Cost Summary */}
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Total Cost</h4>
                <span className="text-2xl font-bold text-green-700">${itinerary.cost_summary.total}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Flights:</span>
                  <span className="font-medium">${itinerary.cost_summary.flights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Accommodation:</span>
                  <span className="font-medium">${itinerary.cost_summary.accommodation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Activities:</span>
                  <span className="font-medium">${itinerary.cost_summary.activities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Meals:</span>
                  <span className="font-medium">${itinerary.cost_summary.meals}</span>
                </div>
              </div>
            </Card>

            {/* Flights */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-600" />
                Flight Options
              </h4>
              <div className="space-y-2">
                {itinerary.flights?.map((flight, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{flight.airline}</p>
                        <p className="text-xs text-slate-600">{flight.departure} → {flight.arrival}</p>
                        <p className="text-xs text-slate-500">{flight.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${flight.price}</p>
                        {flight.booking_url && (
                          <a href={flight.booking_url} target="_blank" rel="noopener noreferrer" 
                             className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                            Book <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Accommodations */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Hotel className="w-4 h-4 text-purple-600" />
                Accommodation Options
              </h4>
              <div className="space-y-2">
                {itinerary.accommodations?.map((hotel, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{hotel.name}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(Math.round(hotel.rating))].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{hotel.location}</p>
                        <p className="text-xs text-slate-500">{hotel.type}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hotel.amenities?.slice(0, 4).map((amenity, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{amenity}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">${hotel.price_per_night}/night</p>
                        <p className="font-bold text-green-600">${hotel.total_cost} total</p>
                        {hotel.booking_url && (
                          <a href={hotel.booking_url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-blue-600 flex items-center gap-1 hover:underline mt-1">
                            Book <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Daily Plan */}
            <div>
              <h4 className="font-semibold mb-2">Daily Itinerary</h4>
              <div className="space-y-3">
                {itinerary.daily_plan?.map((day) => (
                  <Card key={day.day} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-700">Day {day.day}</Badge>
                      <span className="text-xs text-slate-500">{day.date}</span>
                    </div>
                    
                    <div className="space-y-2 ml-4">
                      {day.activities?.map((activity, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-purple-200 pl-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs text-slate-500">{activity.time}</span>
                              <p className="font-medium text-slate-800">{activity.title}</p>
                              <p className="text-xs text-slate-600">{activity.description}</p>
                            </div>
                            <span className="text-xs font-medium text-green-600">${activity.cost}</span>
                          </div>
                        </div>
                      ))}
                      
                      {day.meals?.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <UtensilsCrossed className="w-3 h-3" /> Dining
                          </p>
                          {day.meals.map((meal, idx) => (
                            <div key={idx} className="text-xs text-slate-600 ml-4">
                              {meal.time}: {meal.restaurant} ({meal.cuisine}) - ${meal.estimated_cost}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Packing List Modal */}
        {showPacking && packingList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 safe-area-padding">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-auto safe-area-padding"
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Smart Packing List</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPacking(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Weather Summary */}
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <h4 className="font-semibold text-slate-800 mb-2">Weather Forecast</h4>
                  <p className="text-sm text-slate-700">{packingList.weather_summary}</p>
                </Card>

                {/* Packing Categories */}
                {packingList.categories?.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      {category.name}
                    </h4>
                    <div className="space-y-2">
                      {category.items?.map((item, i) => (
                        <Card key={i} className={`p-3 ${
                          item.priority === 'essential' ? 'border-red-200 bg-red-50' :
                          item.priority === 'recommended' ? 'border-yellow-200 bg-yellow-50' :
                          'border-slate-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">{item.item}</p>
                                <Badge variant="outline" className="text-xs">
                                  {item.quantity}x
                                </Badge>
                                <Badge className={`text-xs ${
                                  item.priority === 'essential' ? 'bg-red-100 text-red-700' :
                                  item.priority === 'recommended' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{item.reason}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Travel Tips */}
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Travel Tips
                  </h4>
                  <ul className="space-y-1">
                    {packingList.travel_tips?.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-700">• {tip}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI Content Assistant for Trip Planning */}
        {showAIAssistant && (
          <AIContentAssistant
            open={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            contentType="trip planning details"
            currentContent={tripNotes}
            context={`Budget: $${preferences.budget}, Duration: ${preferences.duration} days, Style: ${preferences.style}, Destination: ${selectedDestination?.destination || 'Not selected'}`}
            onApply={(content) => {
              setTripNotes(content);
              toast.success('Trip notes updated');
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}