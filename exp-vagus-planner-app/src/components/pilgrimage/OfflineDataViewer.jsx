import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { offlineStorage } from '@/components/utils/offlineStorageService';
import { Loader2 } from 'lucide-react';

export default function OfflineDataViewer() {
  const [data, setData] = useState({
    itineraries: [],
    guides: null,
    prayers: null,
    concierge: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      const [itineraries, guides, prayers, concierge] = await Promise.all([
        offlineStorage.getAllData('itineraries'),
        offlineStorage.getData('ritualGuides', 'guides'),
        offlineStorage.getData('prayerTimes', 'times'),
        offlineStorage.getData('conciergeInfo', 'info')
      ]);

      setData({
        itineraries,
        guides: guides?.data,
        prayers: prayers?.data,
        concierge: concierge?.data
      });
    } catch (error) {
      console.error('Error loading offline data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="itineraries" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="itineraries">
          Itineraries ({data.itineraries.length})
        </TabsTrigger>
        <TabsTrigger value="guides">Ritual Guides</TabsTrigger>
        <TabsTrigger value="prayers">Prayer Times</TabsTrigger>
        <TabsTrigger value="concierge">Concierge</TabsTrigger>
      </TabsList>

      {/* Itineraries */}
      <TabsContent value="itineraries" className="space-y-3">
        {data.itineraries.length === 0 ? (
          <Card className="bg-slate-50">
            <CardContent className="pt-6 text-center text-slate-600">
              No itineraries downloaded yet. Download from settings.
            </CardContent>
          </Card>
        ) : (
          data.itineraries.map(itinerary => (
            <Card key={itinerary.id}>
              <CardHeader>
                <CardTitle className="text-base">{itinerary.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-slate-600">{itinerary.destination}</p>
                <div className="flex gap-2">
                  <Badge>{itinerary.start_date}</Badge>
                  <Badge>{itinerary.end_date}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-800">
                    ${itinerary.budget}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Ritual Guides */}
      <TabsContent value="guides" className="space-y-3">
        {data.guides ? (
          <div className="space-y-3">
            {data.guides.umrah_steps && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Umrah Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.guides.umrah_steps.map((step, i) => (
                    <div key={i} className="bg-blue-50 rounded p-3 text-sm">
                      <p className="font-semibold text-blue-900">
                        Step {step.step}: {step.title}
                      </p>
                      <p className="text-blue-800 text-xs mt-1">{step.description}</p>
                      <p className="text-blue-600 text-xs mt-1">⏱️ {step.duration_minutes} minutes</p>
                      <ul className="mt-2 space-y-1">
                        {step.key_points?.map((point, j) => (
                          <li key={j} className="text-blue-800 text-xs">• {point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="bg-slate-50">
            <CardContent className="pt-6 text-center text-slate-600">
              No ritual guides downloaded yet.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Prayer Times */}
      <TabsContent value="prayers" className="space-y-3">
        {data.prayers?.cached_times ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.prayers.cached_times.slice(0, 7).map((day, i) => (
              <Card key={i} className="p-3">
                <p className="font-semibold text-slate-900 mb-2">{day.date}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-emerald-50 p-2 rounded">
                    <p className="text-emerald-600">Fajr</p>
                    <p className="font-semibold text-emerald-900">{day.fajr}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-blue-600">Dhuhr</p>
                    <p className="font-semibold text-blue-900">{day.dhuhr}</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <p className="text-purple-600">Maghrib</p>
                    <p className="font-semibold text-purple-900">{day.maghrib}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-50">
            <CardContent className="pt-6 text-center text-slate-600">
              No prayer times downloaded yet.
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Concierge Info */}
      <TabsContent value="concierge" className="space-y-3">
        {data.concierge ? (
          <div className="space-y-3">
            {data.concierge.essential_numbers && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(data.concierge.essential_numbers).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-slate-600 capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-semibold text-red-600">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {data.concierge.crowd_management && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {Object.entries(data.concierge.crowd_management).map(([key, value]) => (
                    <div key={key} className="bg-amber-50 p-2 rounded text-amber-900">
                      <p className="font-semibold">{key.replace('_', ' ')}</p>
                      <p className="text-xs">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="bg-slate-50">
            <CardContent className="pt-6 text-center text-slate-600">
              No concierge info downloaded yet.
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}