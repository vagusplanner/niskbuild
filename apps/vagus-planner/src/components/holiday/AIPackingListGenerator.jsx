import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Luggage, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { requireVpAiFunctions } from '@/lib/vp-registered-functions';

function tripStart(trip) {
  return (trip?.start_date || trip?.date || '').toString().split('T')[0];
}

function tripEnd(trip) {
  const end = (trip?.end_date || '').toString().split('T')[0];
  if (end) return end;
  const start = tripStart(trip);
  return start || new Date().toISOString().split('T')[0];
}

export default function AIPackingListGenerator() {
  const available = requireVpAiFunctions('planTripWithAi');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  const { data: upcomingTrips = [] } = useQuery({
    queryKey: ['upcoming-trips'],
    queryFn: async () => {
      const all = await base44.entities.Holiday.list('-start_date');
      return all.filter(h => h.status === 'planned' || h.status === 'booked');
    }
  });

  const generatePackingList = async () => {
    if (!selectedTrip) return;

    const trip = upcomingTrips.find(t => t.id === selectedTrip);
    if (!trip?.destination) {
      toast.error('Selected trip has no destination');
      return;
    }

    const start = tripStart(trip);
    if (!start) {
      toast.error('Selected trip is missing a start date');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('planTripWithAi', {
        destination: trip.destination,
        start_date: start,
        end_date: tripEnd(trip),
        packing_only: true,
        travel_style: 'balanced',
        create_holiday: false,
      });
      const data = res?.data ?? res;
      const categories =
        data?.categories ||
        (data?.packing_list || []).map((c) => ({
          name: c.category,
          items: (c.items || []).map((item) =>
            typeof item === 'string'
              ? { item, reason: '', priority: 'recommended' }
              : item
          ),
        }));

      setPackingList({
        categories,
        weather_note: data?.weather_summary || '',
        special_tips: data?.special_tips || data?.travel_tips || [],
      });
      setCheckedItems({});
      toast.success('Packing list ready');
    } catch (error) {
      console.error('Failed to generate packing list:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate packing list');
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

  if (!available) {
    return (
      <p className="text-sm text-slate-500">AI packing list is not available on this build.</p>
    );
  }

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
                {trip.destination || trip.title || trip.name} - {tripStart(trip)
                  ? new Date(tripStart(trip)).toLocaleDateString()
                  : 'no date'}
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
                  <span className="font-medium">Note:</span> {packingList.weather_note}
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
                    const label = typeof item === 'string' ? item : item.item;

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
                              {label}
                            </span>
                            {item?.priority && (
                              <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          {item?.reason && <p className="text-xs text-slate-600">{item.reason}</p>}
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
                <h3 className="font-medium text-teal-800 mb-2">Travel Tips</h3>
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
