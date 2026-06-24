import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, MapPin, Calendar, DollarSign, ExternalLink,
  Loader2, TrendingUp, Star, Route, AlertCircle, Package
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function AIHolidaySuggestions({ onCreateHoliday }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list('-created_date', 50)
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => SDK.entities.Holiday.list('-start_date')
  });

  const userSettings = settings[0] || {};

  const generateSuggestions = async () => {
    if (!userSettings.travel_interests || userSettings.travel_interests.length === 0) {
      toast.error('Please complete your profile with travel interests first');
      return;
    }

    setLoading(true);
    try {
      // Deep pattern analysis of past holidays
      const completedHolidays = holidays.filter(h => h.status === 'completed');
      const avgBudget = completedHolidays.length > 0 
        ? Math.round(completedHolidays.reduce((sum, h) => sum + (h.budget || 0), 0) / completedHolidays.length)
        : null;
      const avgDuration = holidays.length > 0 
        ? Math.round(holidays.reduce((sum, h) => sum + (new Date(h.end_date) - new Date(h.start_date)) / (1000 * 60 * 60 * 24), 0) / holidays.length)
        : 7;
      const preferredDestinations = completedHolidays.map(h => h.destination).join(', ') || 'None';
      const seasonalPreferences = holidays.reduce((acc, h) => {
        const month = new Date(h.start_date).getMonth();
        const season = month < 3 ? 'Winter' : month < 6 ? 'Spring' : month < 9 ? 'Summer' : 'Fall';
        acc[season] = (acc[season] || 0) + 1;
        return acc;
      }, {});
      const preferredSeason = Object.keys(seasonalPreferences).reduce((a, b) => 
        seasonalPreferences[a] > seasonalPreferences[b] ? a : b, 'Any');

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an advanced AI travel assistant with deep learning capabilities. Analyze the user's complete travel history and profile to predict and suggest perfect destinations.

USER PROFILE:
- Travel Interests: ${userSettings.travel_interests?.join(', ') || 'Not specified'}
- Dietary Preferences: ${userSettings.dietary_preferences?.join(', ') || 'None'}
- Location: ${userSettings.location_city}, ${userSettings.location_country}
- Work Style: ${userSettings.work_style || 'flexible'}

CALENDAR AVAILABILITY:
${events.slice(0, 20).map(e => `${e.date}: ${e.title} (${e.category})`).join('\n')}

LEARNED TRAVEL PATTERNS (CRITICAL - Use this to predict preferences):
- Past Destinations: ${preferredDestinations}
- Average Budget: ${avgBudget ? `$${avgBudget}` : 'Unknown'}
- Preferred Trip Duration: ${avgDuration} days
- Preferred Season: ${preferredSeason} (based on ${Object.entries(seasonalPreferences).map(([s, c]) => `${s}: ${c} trips`).join(', ')})
- Travel History: ${completedHolidays.length} completed trips, ${holidays.filter(h => h.status === 'planned').length} planned
- Accommodation Preferences: ${completedHolidays.filter(h => h.accommodation).map(h => h.accommodation).join('; ') || 'Not specified'}

PAST HOLIDAY DETAILS:
${holidays.map(h => `
  • ${h.destination} (${h.status})
  • Duration: ${Math.round((new Date(h.end_date) - new Date(h.start_date)) / (1000 * 60 * 60 * 24))} days
  • Budget: ${h.budget ? `$${h.budget}` : 'N/A'}
  • Notes: ${h.notes || 'None'}
  • Accommodation: ${h.accommodation || 'N/A'}
`).join('\n') || 'No travel history'}

PREDICTION INSTRUCTIONS:
1. Use past destinations to identify regional preferences (e.g., if visited Paris, suggest other European cities)
2. Match budget range from historical spending patterns
3. Suggest trip durations similar to their average
4. Prioritize their preferred travel season
5. Recommend destinations with their stated interests AND similar vibes to past trips
6. Consider dietary preferences for destination food culture

Provide 3-4 AI-predicted holiday suggestions ranked by confidence (0-1 scale).
Include diverse options: one similar to past trips (safe bet), one adventurous stretch, one budget-friendly.

IMPORTANT: For each suggestion:
1. Check if multi-city trip makes sense (if yes, suggest optimal route)
2. Generate integrated package URLs for flight+hotel+car
3. Provide visa requirements information
4. Suggest optimal route if multi-city

Current date: ${format(new Date(), 'MMMM yyyy')}`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  destination: { type: "string" },
                  country: { type: "string" },
                  description: { type: "string" },
                  best_time: { type: "string" },
                  suggested_dates: {
                    type: "object",
                    properties: {
                      start: { type: "string" },
                      end: { type: "string" }
                    }
                  },
                  budget_range: { type: "string" },
                  why_recommended: { type: "string" },
                  interests_matched: { type: "array", items: { type: "string" } },
                  booking_url: { type: "string" },
                  key_attractions: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                  flight_search_url: { type: "string" },
                  car_rental_url: { type: "string" },
                  prediction_reasoning: { type: "string" },
                  is_multi_city: { type: "boolean" },
                  multi_city_route: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        days: { type: "number" },
                        highlights: { type: "array", items: { type: "string" } }
                      }
                    }
                  },
                  package_url: { type: "string" },
                  visa_required: { type: "boolean" },
                  visa_info: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0 && userSettings.travel_interests?.length > 0) {
      generateSuggestions();
    }
  }, []);

  if (!suggestions && !loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            AI Holiday Suggestions
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Get personalized destination recommendations based on your calendar and interests
          </p>
          <Button
            onClick={generateSuggestions}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Suggestions
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-800">AI Holiday Suggestions</h3>
        </div>
        <Button
          onClick={generateSuggestions}
          size="sm"
          variant="outline"
          disabled={loading}
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Finding perfect destinations for you...</p>
        </div>
      )}

      {suggestions && (
        <div className="grid gap-4">
          {suggestions.map((suggestion, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-5 bg-gradient-to-br from-white to-purple-50/30 border-purple-100 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {suggestion.destination}
                      </h4>
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-slate-600 flex items-center gap-1 text-sm">
                      <MapPin className="w-4 h-4" />
                      {suggestion.country}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(suggestion.confidence * 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-3">
                  {suggestion.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestion.interests_matched.map((interest, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-purple-50">
                      {interest}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-700">Best Time: {suggestion.best_time}</p>
                      {suggestion.suggested_dates && (
                        <p className="text-slate-500 text-xs">
                          Suggested: {format(new Date(suggestion.suggested_dates.start), 'MMM d')} - {format(new Date(suggestion.suggested_dates.end), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-700">{suggestion.budget_range}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5" />
                    <p className="text-slate-600 text-xs">{suggestion.why_recommended}</p>
                  </div>
                  {suggestion.prediction_reasoning && (
                    <div className="flex items-start gap-2 bg-purple-50 p-2 rounded mt-2">
                      <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                      <p className="text-slate-600 text-xs"><span className="font-medium">AI Prediction:</span> {suggestion.prediction_reasoning}</p>
                    </div>
                  )}
                </div>

                {suggestion.key_attractions?.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50/50 rounded-lg">
                    <p className="text-xs font-medium text-slate-700 mb-1">Key Attractions:</p>
                    <ul className="text-xs text-slate-600 space-y-0.5">
                      {suggestion.key_attractions.map((attraction, i) => (
                        <li key={i}>• {attraction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.is_multi_city && suggestion.multi_city_route?.length > 0 && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Route className="w-4 h-4 text-indigo-600" />
                      <p className="text-xs font-medium text-slate-700">Multi-City Route:</p>
                    </div>
                    <div className="space-y-2">
                      {suggestion.multi_city_route.map((stop, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800">{stop.city} ({stop.days} days)</p>
                            <p className="text-xs text-slate-600">{stop.highlights?.join(', ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestion.visa_required && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-slate-700">Visa Required</p>
                        <p className="text-xs text-slate-600 mt-0.5">{suggestion.visa_info}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={() => onCreateHoliday({
                      title: `${suggestion.destination} Trip`,
                      destination: `${suggestion.destination}, ${suggestion.country}`,
                      start_date: suggestion.suggested_dates?.start || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                      end_date: suggestion.suggested_dates?.end || format(addDays(new Date(), 37), 'yyyy-MM-dd'),
                      status: 'planned',
                      notes: suggestion.why_recommended,
                      is_multi_city: suggestion.is_multi_city || false,
                      cities: suggestion.multi_city_route || [],
                      visa_requirements: {
                        required: suggestion.visa_required || false,
                        notes: suggestion.visa_info || ''
                      },
                      package_booking: {
                        package_url: suggestion.package_url || '',
                        flight_url: suggestion.flight_search_url || '',
                        car_rental_url: suggestion.car_rental_url || ''
                      }
                    })}
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Add to Calendar & My Holidays
                  </Button>
                  {suggestion.package_url && (
                    <Button
                      onClick={() => window.open(suggestion.package_url, '_blank')}
                      size="sm"
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      View Complete Package Deal
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => window.open(suggestion.booking_url || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(suggestion.destination)}`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Booking.com
                    </Button>
                    <Button
                      onClick={() => window.open(suggestion.flight_search_url || `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=to:${encodeURIComponent(suggestion.destination)},from:${encodeURIComponent(userSettings.location_city || '')},departure:${suggestion.suggested_dates?.start || ''}&leg2=to:${encodeURIComponent(userSettings.location_city || '')},from:${encodeURIComponent(suggestion.destination)},departure:${suggestion.suggested_dates?.end || ''}&passengers=adults:1`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Expedia Flights
                    </Button>
                    <Button
                      onClick={() => window.open(`https://www.kayak.com/flights/${encodeURIComponent(userSettings.location_city || '')}/${encodeURIComponent(suggestion.destination)}/${suggestion.suggested_dates?.start || ''}/${suggestion.suggested_dates?.end || ''}`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Kayak
                    </Button>
                    <Button
                      onClick={() => window.open(suggestion.car_rental_url || `https://www.kayak.com/cars/${encodeURIComponent(suggestion.destination)}/${suggestion.suggested_dates?.start || ''}/${suggestion.suggested_dates?.end || ''}`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Car Rental
                    </Button>
                    <Button
                      onClick={() => window.open(`https://www.airbnb.com/s/${encodeURIComponent(suggestion.destination)}`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Airbnb
                    </Button>
                    <Button
                      onClick={() => window.open(`https://www.getyourguide.com/s/?q=${encodeURIComponent(suggestion.destination)}`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Tours
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}