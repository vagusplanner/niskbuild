import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Loader2, MapPin, Hotel, Utensils, 
  Activity, Clock, DollarSign, Star, AlertCircle,
  CheckCircle2, TrendingUp, Calendar, Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnhancedTravelPlanner({ destination, budget, duration, startDate, onComplete }) {
  const [activeTab, setActiveTab] = useState('activities');
  const [activities, setActivities] = useState(null);
  const [accommodations, setAccommodations] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [optimizedItinerary, setOptimizedItinerary] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(null);
  const [loading, setLoading] = useState({});

  const fetchActivities = async () => {
    setLoading(prev => ({ ...prev, activities: true }));
    try {
      const { data } = await base44.functions.invoke('enhancedTravelAI', {
        action: 'suggest_activities',
        destination,
        duration_days: duration,
        budget
      });
      setActivities(data.activities);
      toast.success(`Found ${data.activities.length} personalized activities`);
    } catch (error) {
      toast.error('Failed to fetch activities');
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  };

  const fetchAccommodations = async () => {
    setLoading(prev => ({ ...prev, accommodations: true }));
    try {
      const { data } = await base44.functions.invoke('enhancedTravelAI', {
        action: 'suggest_accommodations',
        destination,
        budget_per_night: Math.round(budget / (duration * 2)),
        duration_nights: duration
      });
      setAccommodations(data.accommodations);
      toast.success(`Found ${data.accommodations.length} accommodation options`);
    } catch (error) {
      toast.error('Failed to fetch accommodations');
    } finally {
      setLoading(prev => ({ ...prev, accommodations: false }));
    }
  };

  const fetchRealTimeUpdates = async () => {
    setLoading(prev => ({ ...prev, updates: true }));
    try {
      const { data } = await base44.functions.invoke('enhancedTravelAI', {
        action: 'real_time_updates',
        destination,
        start_date: startDate
      });
      setRealTimeUpdates(data.updates);
      toast.success('Real-time updates loaded');
    } catch (error) {
      toast.error('Failed to fetch updates');
    } finally {
      setLoading(prev => ({ ...prev, updates: false }));
    }
  };

  const optimizeItinerary = async () => {
    if (selectedActivities.length === 0) {
      toast.error('Please select some activities first');
      return;
    }

    setLoading(prev => ({ ...prev, optimize: true }));
    try {
      const { data } = await base44.functions.invoke('enhancedTravelAI', {
        action: 'optimize_itinerary',
        destination,
        activities: selectedActivities,
        duration_days: duration,
        start_date: startDate
      });
      setOptimizedItinerary(data.itinerary);
      setActiveTab('itinerary');
      toast.success('Itinerary optimized!');
    } catch (error) {
      toast.error('Failed to optimize itinerary');
    } finally {
      setLoading(prev => ({ ...prev, optimize: false }));
    }
  };

  const toggleActivity = (activity) => {
    setSelectedActivities(prev => 
      prev.find(a => a.name === activity.name)
        ? prev.filter(a => a.name !== activity.name)
        : [...prev, activity]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{destination}</h2>
        <div className="flex gap-2">
          <Button
            onClick={fetchRealTimeUpdates}
            variant="outline"
            size="sm"
            disabled={loading.updates}
          >
            {loading.updates ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
            <span className="ml-2">Live Updates</span>
          </Button>
          <Button
            onClick={optimizeItinerary}
            disabled={loading.optimize || selectedActivities.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            {loading.optimize ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Optimize Itinerary ({selectedActivities.length})
          </Button>
        </div>
      </div>

      {realTimeUpdates && (
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Real-Time Travel Intelligence
          </h3>
          
          {realTimeUpdates.travel_advisories?.length > 0 && (
            <div className="mb-3 space-y-2">
              {realTimeUpdates.travel_advisories.map((advisory, idx) => (
                <div key={idx} className={`p-2 rounded-lg ${
                  advisory.severity === 'critical' ? 'bg-red-100 border border-red-200' :
                  advisory.severity === 'warning' ? 'bg-amber-100 border border-amber-200' :
                  'bg-blue-100 border border-blue-200'
                }`}>
                  <p className="font-medium text-sm">{advisory.type}</p>
                  <p className="text-xs text-slate-700">{advisory.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {realTimeUpdates.weather && (
              <div className="bg-white p-2 rounded">
                <p className="text-xs text-slate-500">Weather</p>
                <p className="font-medium">{realTimeUpdates.weather.current}</p>
              </div>
            )}
            {realTimeUpdates.safety_score && (
              <div className="bg-white p-2 rounded">
                <p className="text-xs text-slate-500">Safety Score</p>
                <p className="font-medium">{realTimeUpdates.safety_score}/10</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activities">
            <Activity className="w-4 h-4 mr-2" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="accommodations">
            <Hotel className="w-4 h-4 mr-2" />
            Stay
          </TabsTrigger>
          <TabsTrigger value="itinerary" disabled={!optimizedItinerary}>
            <Calendar className="w-4 h-4 mr-2" />
            Itinerary
          </TabsTrigger>
          <TabsTrigger value="summary">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          {!activities ? (
            <Card className="p-8 text-center">
              <Activity className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">Discover personalized activities and experiences</p>
              <Button onClick={fetchActivities} disabled={loading.activities} className="bg-purple-600 hover:bg-purple-700">
                {loading.activities ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Get Activity Suggestions
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {activities.map((activity, idx) => {
                const isSelected = selectedActivities.find(a => a.name === activity.name);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-purple-500 border-2 bg-purple-50' : 'hover:border-purple-300'
                      }`}
                      onClick={() => toggleActivity(activity)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{activity.name}</h4>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{activity.location}</p>
                          <Badge className="text-xs">{activity.category}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${
                                i < activity.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                              }`} />
                            ))}
                          </div>
                          <p className="text-sm font-bold text-green-600">${activity.cost}</p>
                          <p className="text-xs text-slate-500">{activity.duration_hours}h</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{activity.description}</p>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-600">{activity.best_time}</span>
                      </div>
                      <p className="text-xs text-purple-600 mb-2">💡 {activity.why_recommended}</p>
                      {activity.insider_tips?.length > 0 && (
                        <div className="text-xs text-slate-500 bg-amber-50 p-2 rounded">
                          <strong>Insider Tip:</strong> {activity.insider_tips[0]}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accommodations" className="space-y-4">
          {!accommodations ? (
            <Card className="p-8 text-center">
              <Hotel className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">Find the perfect place to stay</p>
              <Button onClick={fetchAccommodations} disabled={loading.accommodations} className="bg-purple-600 hover:bg-purple-700">
                {loading.accommodations ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Get Accommodation Options
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {accommodations.map((hotel, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className={`p-4 cursor-pointer transition-all ${
                      selectedAccommodation?.name === hotel.name ? 'border-purple-500 border-2 bg-purple-50' : 'hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedAccommodation(hotel)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 mb-1">{hotel.name}</h4>
                        <p className="text-xs text-slate-600 mb-1">{hotel.neighborhood}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${
                                i < hotel.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                              }`} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">({hotel.review_count} reviews)</span>
                        </div>
                        <Badge className="text-xs mb-2">{hotel.type}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">${hotel.price_per_night}/night</p>
                        <p className="text-lg font-bold text-green-600">${hotel.total_cost}</p>
                        <p className="text-xs text-slate-500">total</p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-600 mb-2">💡 {hotel.why_recommended}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {hotel.amenities?.slice(0, 5).map((amenity, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{amenity}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {hotel.distance_to_center} from center
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="itinerary" className="space-y-4">
          {optimizedItinerary && (
            <div className="space-y-4">
              {optimizedItinerary.map((day, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">Day {day.day}</h3>
                      <p className="text-sm text-slate-600">{day.date} • {day.theme}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-bold text-green-600">${day.total_cost}</p>
                      <p className="text-xs text-slate-500">{day.total_walking} walking</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {day.schedule?.map((item, i) => (
                      <div key={i} className="flex gap-3 border-l-2 border-purple-200 pl-3">
                        <div className="min-w-[60px] text-sm font-medium text-purple-700">
                          {item.time}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{item.activity}</p>
                          <p className="text-xs text-slate-600">{item.location}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{item.duration}</span>
                            <span>${item.cost}</span>
                          </div>
                          {item.notes && <p className="text-xs text-purple-600 mt-1">💡 {item.notes}</p>}
                          {item.travel_to_next && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                              <Navigation className="w-3 h-3" />
                              {item.travel_to_next}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Trip Summary</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-sm text-slate-600 mb-1">Activities Selected</p>
                <p className="text-2xl font-bold text-purple-700">{selectedActivities.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-sm text-slate-600 mb-1">Total Budget</p>
                <p className="text-2xl font-bold text-green-700">
                  ${(selectedActivities.reduce((sum, a) => sum + a.cost, 0) + (selectedAccommodation?.total_cost || 0)).toFixed(0)}
                </p>
              </div>
            </div>

            {selectedAccommodation && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Accommodation:</p>
                <p className="text-slate-800">{selectedAccommodation.name}</p>
                <p className="text-sm text-slate-600">${selectedAccommodation.total_cost} total</p>
              </div>
            )}

            <Button 
              onClick={() => onComplete({ 
                activities: selectedActivities, 
                accommodation: selectedAccommodation,
                itinerary: optimizedItinerary 
              })}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Save Complete Trip Plan
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}