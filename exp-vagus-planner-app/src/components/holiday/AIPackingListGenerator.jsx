import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Luggage, Sparkles, Download } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AIPackingListGenerator() {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  const { data: upcomingTrips = [] } = useQuery({
    queryKey: ['upcoming-trips'],
    queryFn: async () => {
      const all = await SDK.entities.Holiday.list('-start_date');
      return all.filter(h => h.status === 'planned' || h.status === 'booked');
    }
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const generatePackingList = async () => {
    if (!selectedTrip) return;

    const trip = upcomingTrips.find(t => t.id === selectedTrip);
    if (!trip) return;

    setLoading(true);
    try {
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive packing list for this trip:

Destination: ${trip.destination}
Duration: ${trip.start_date} to ${trip.end_date}
Trip type: ${trip.is_multi_city ? 'Multi-city' : 'Single destination'}
${trip.accommodation ? `Accommodation: ${trip.accommodation}` : ''}

Traveler preferences:
- Dietary: ${settings[0]?.dietary_preferences?.join(', ') || 'None specified'}
- Travel interests: ${settings[0]?.travel_interests?.join(', ') || 'General'}

Provide:
1. Essential items (documents, money, tech)
2. Clothing (based on weather and activities)
3. Toiletries & personal care
4. Health & medications
5. Activity-specific gear
6. Optional comfort items

Current date: ${new Date().toISOString().split('T')[0]}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        reason: { type: "string" },
                        priority: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            weather_note: { type: "string" },
            special_tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setPackingList(response);
      setCheckedItems({});
    } catch (error) {
      console.error('Failed to generate packing list:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (category, itemIndex) => {
    const key = `${category}-${itemIndex}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getPriorityColor = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'essential' || p === 'high') return 'bg-red-100 text-red-700';
    if (p === 'important' || p === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedTrip} onValueChange={setSelectedTrip}>
          <SelectTrigger>
            <SelectValue placeholder="Select a trip" />
          </SelectTrigger>
          <SelectContent>
            {upcomingTrips.map(trip => (
              <SelectItem key={trip.id} value={trip.id}>
                {trip.destination} - {new Date(trip.start_date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={generatePackingList}
          disabled={!selectedTrip || loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate List
            </>
          )}
        </Button>
      </div>

      {packingList && (
        <div className="space-y-4">
          {packingList.weather_note && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Weather Info:</span> {packingList.weather_note}
                </p>
              </CardContent>
            </Card>
          )}

          {packingList.categories?.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Luggage className="w-4 h-4 text-teal-600" />
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.items?.map((item, itemIndex) => {
                    const key = `${catIndex}-${itemIndex}`;
                    const isChecked = checkedItems[key];
                    
                    return (
                      <div 
                        key={itemIndex}
                        className={`flex items-start gap-3 p-2 rounded ${isChecked ? 'opacity-50' : ''}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleItem(catIndex, itemIndex)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isChecked ? 'line-through' : ''}`}>
                              {item.item}
                            </span>
                            <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">{item.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {packingList.special_tips && packingList.special_tips.length > 0 && (
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <h3 className="font-medium text-teal-800 mb-2">💡 Travel Tips</h3>
                <ul className="space-y-1">
                  {packingList.special_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-teal-700">• {tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}