import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane, Hotel, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TravelDetailsForm({ activeTrip }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    destination: activeTrip?.destination || 'Mecca, Saudi Arabia',
    start_date: activeTrip?.start_date || '',
    end_date: activeTrip?.end_date || '',
    accommodation: activeTrip?.accommodation || '',
    flight_details: activeTrip?.flight_details || '',
    notes: activeTrip?.notes || '',
    cities: activeTrip?.cities || []
  });

  const [newCity, setNewCity] = useState({ city: '', arrival_date: '', departure_date: '' });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (activeTrip) {
        return await SDK.entities.Holiday.update(activeTrip.id, data);
      } else {
        return await SDK.entities.Holiday.create({
          ...data,
          status: 'planned',
          is_multi_city: data.cities.length > 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hajjUmrahTrips'] });
      toast.success(activeTrip ? 'Travel details updated' : 'Trip created successfully');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addCity = () => {
    if (newCity.city && newCity.arrival_date) {
      setFormData(prev => ({
        ...prev,
        cities: [...(prev.cities || []), newCity]
      }));
      setNewCity({ city: '', arrival_date: '', departure_date: '' });
    }
  };

  const removeCity = (index) => {
    setFormData(prev => ({
      ...prev,
      cities: prev.cities.filter((_, i) => i !== index)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-blue-600" />
          {activeTrip ? 'Update Travel Details' : 'Add New Journey'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Mecca, Saudi Arabia"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Accommodation</Label>
              <Input
                value={formData.accommodation}
                onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                placeholder="Hotel name"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Flight Details */}
          <div className="space-y-2">
            <Label>Flight Details</Label>
            <Input
              value={formData.flight_details}
              onChange={(e) => setFormData({ ...formData, flight_details: e.target.value })}
              placeholder="Flight number, departure time, etc."
            />
          </div>

          {/* Multi-City Itinerary */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Hotel className="w-4 h-4" />
              Multi-City Itinerary (Optional)
            </Label>
            
            {formData.cities?.map((city, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{city.city}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(city.arrival_date).toLocaleDateString()} - {city.departure_date ? new Date(city.departure_date).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCity(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="City name"
                value={newCity.city}
                onChange={(e) => setNewCity({ ...newCity, city: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Arrival"
                value={newCity.arrival_date}
                onChange={(e) => setNewCity({ ...newCity, arrival_date: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Departure"
                value={newCity.departure_date}
                onChange={(e) => setNewCity({ ...newCity, departure_date: e.target.value })}
              />
              <Button type="button" onClick={addCity} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add City
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional travel notes..."
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : (activeTrip ? 'Update Journey' : 'Create Journey')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}