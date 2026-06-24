import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AIItinerarySuggestions({ onCreateTrip }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const { data: pastHolidays = [] } = useQuery({
    queryKey: ['past-holidays'],
    queryFn: () => SDK.entities.Holiday.list('-created_date', 10)
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `Based on this traveler's profile, suggest 3 personalized trip itineraries.

User Preferences:
- Travel interests: ${settings[0]?.travel_interests?.join(', ') || 'Not specified'}
- Dietary preferences: ${settings[0]?.dietary_preferences?.join(', ') || 'None'}

Past trips:
${pastHolidays.slice(0, 5).map(h => `- ${h.destination} (${h.start_date})`).join('\n') || 'No past trips'}

For each suggestion, provide:
1. Destination name
2. Trip duration (days)
3. Best time to visit
4. Key activities (3-5)
5. Estimated budget range
6. Why it matches their preferences`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  destination: { type: "string" },
                  duration_days: { type: "number" },
                  best_time: { type: "string" },
                  activities: { type: "array", items: { type: "string" } },
                  budget_range: { type: "string" },
                  match_reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          AI analyzes your travel history and preferences to suggest perfect trips
        </p>
        <Button 
          onClick={generateSuggestions} 
          disabled={loading}
          size="sm"
          className="bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="grid gap-4">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {suggestion.destination}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        {suggestion.duration_days} days
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {suggestion.best_time}
                      </Badge>
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                        {suggestion.budget_range}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Recommended Activities:</p>
                  <ul className="space-y-1">
                    {suggestion.activities.map((activity, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {activity}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-teal-50 rounded-lg mb-4">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Perfect for you because:</span> {suggestion.match_reason}
                  </p>
                </div>

                <Button 
                  onClick={() => onCreateTrip?.({
                    destination: suggestion.destination,
                    title: `Trip to ${suggestion.destination}`,
                    status: 'planned'
                  })}
                  className="w-full"
                  variant="outline"
                >
                  Plan This Trip
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}