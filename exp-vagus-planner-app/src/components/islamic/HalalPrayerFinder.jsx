import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, UtensilsCrossed, Compass, Droplet } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HalalPrayerFinder() {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState(null);
  const [activeTab, setActiveTab] = useState('prayer');
  const [userLocation, setUserLocation] = useState(null);

  const fetchLocations = async () => {
    if (!userLocation) {
      toast.error('Please enable location services');
      return;
    }

    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('getHalalAndPrayerLocations', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        dietary_preferences: [],
        radius_km: 2
      });
      setLocations(data);
      toast.success('Locations found nearby!');
    } catch (error) {
      toast.error('Failed to find locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }),
        () => toast.error('Unable to get location')
      );
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            Prayer Times & Halal Food Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={fetchLocations}
            disabled={loading || !userLocation}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding nearby facilities...
              </>
            ) : (
              'Find Nearby Facilities'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      {locations && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex gap-2 border-b">
            {[
              { id: 'prayer', label: 'Prayer Facilities', icon: Compass },
              { id: 'food', label: 'Halal Restaurants', icon: UtensilsCrossed },
              { id: 'quick', label: 'Quick Food', icon: Clock },
              { id: 'hydration', label: 'Water Stations', icon: Droplet }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Prayer Facilities */}
          {activeTab === 'prayer' && locations.prayer_facilities && (
            <div className="space-y-3">
              {locations.prayer_facilities.map((facility, idx) => (
                <Card key={idx} className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{facility.name}</h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {facility.distance_km}km away • {facility.type}
                        </p>
                      </div>

                      {facility.prayer_times && (
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          {Object.entries(facility.prayer_times).map(([name, time]) => (
                            <div key={name} className="text-center p-2 bg-blue-50 rounded">
                              <p className="font-semibold text-blue-900">{name.slice(0, 3).toUpperCase()}</p>
                              <p className="text-slate-600">{time}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {facility.facilities?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {facility.facilities.map((fac, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {fac.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          Status: <Badge className={facility.current_congestion === 'empty' ? 'bg-green-600' : facility.current_congestion === 'moderate' ? 'bg-yellow-600' : 'bg-red-600'}>
                            {facility.current_congestion}
                          </Badge>
                        </span>
                        {facility.accessibility && <span className="text-emerald-600">♿ {facility.accessibility}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Halal Restaurants */}
          {activeTab === 'food' && locations.halal_restaurants && (
            <div className="space-y-3">
              {locations.halal_restaurants.map((restaurant, idx) => (
                <Card key={idx} className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{restaurant.name}</h3>
                        <p className="text-xs text-slate-600">{restaurant.distance_km}km away • {restaurant.cuisine_type}</p>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{restaurant.price_range}</Badge>
                        <Badge variant="outline" className="text-xs">{restaurant.ratings}⭐</Badge>
                        {restaurant.halal_certification && (
                          <Badge className="bg-green-600 text-xs">✓ {restaurant.halal_certification}</Badge>
                        )}
                      </div>

                      {restaurant.specialties?.length > 0 && (
                        <p className="text-xs text-slate-700"><strong>Specialties:</strong> {restaurant.specialties.join(', ')}</p>
                      )}

                      {restaurant.dietary_options?.length > 0 && (
                        <p className="text-xs text-slate-700"><strong>Options:</strong> {restaurant.dietary_options.join(', ')}</p>
                      )}

                      <p className="text-xs text-slate-600 italic">{restaurant.why_recommended}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Food Stalls */}
          {activeTab === 'quick' && locations.quick_food_stalls && (
            <div className="space-y-2">
              {locations.quick_food_stalls.map((stall, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{stall.name}</h3>
                        <p className="text-xs text-slate-600">{stall.distance_km}km • {stall.specialty}</p>
                        <p className="text-xs text-slate-700 mt-1">{stall.popular_items?.join(', ')}</p>
                      </div>
                      <Badge className="text-xs">{stall.price}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Hydration Points */}
          {activeTab === 'hydration' && locations.hydration_points && (
            <div className="space-y-2">
              {locations.hydration_points.map((point, idx) => (
                <Card key={idx} className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{point.location}</h3>
                        <p className="text-xs text-slate-600">{point.distance_km}km • {point.type}</p>
                        <p className="text-xs text-slate-600 mt-1">Hours: {point.availability}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {locations.recommendations && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-base">Smart Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Best prayer time:</strong> {locations.recommendations.best_prayer_time}</p>
                <p><strong>Best meal option:</strong> {locations.recommendations.best_meal_option}</p>
                <p><strong>Hydration strategy:</strong> {locations.recommendations.hydration_strategy}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}