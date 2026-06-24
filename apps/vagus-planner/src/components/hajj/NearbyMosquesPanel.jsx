import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Compass, MapPin, Navigation, Phone, ExternalLink, Loader2, Star } from 'lucide-react';

export default function NearbyMosquesPanel({ destination, compact = false }) {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMosques = async () => {
      setLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Find the top 5 most important mosques near ${destination || 'Mecca, Saudi Arabia'}. Include name, brief description, distance from city center, and any special significance. For Mecca/Makkah, prioritize Masjid al-Haram. For Medina/Madinah, prioritize Masjid an-Nabawi.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              mosques: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    distance: { type: 'string' },
                    significance: { type: 'string' },
                    is_major: { type: 'boolean' }
                  }
                }
              }
            }
          }
        });
        setMosques(result.mosques || []);
      } catch (error) {
        console.error('Failed to fetch mosques:', error);
      } finally {
        setLoading(false);
      }
    };

    if (destination) {
      fetchMosques();
    }
  }, [destination]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        <span className="ml-2 text-sm text-slate-600">Finding nearby mosques...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {mosques.slice(0, 3).map((mosque, idx) => (
          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Compass className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{mosque.name}</p>
                </div>
                {mosque.distance && (
                  <p className="text-xs text-slate-500">{mosque.distance}</p>
                )}
              </div>
              {mosque.is_major && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
        {mosques.length > 3 && (
          <p className="text-xs text-center text-slate-500">+{mosques.length - 3} more mosques</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-purple-600" />
          Nearby Mosques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mosques.map((mosque, idx) => (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border transition-all ${
              mosque.is_major 
                ? 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-900' 
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-bold ${mosque.is_major ? 'text-purple-800 dark:text-purple-200' : 'text-slate-800 dark:text-slate-100'}`}>
                    {mosque.name}
                  </h4>
                  {mosque.is_major && (
                    <Badge className="bg-amber-500 text-white border-0">
                      <Star className="w-3 h-3 mr-1" />
                      Major
                    </Badge>
                  )}
                </div>
                {mosque.distance && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{mosque.distance}</span>
                  </div>
                )}
              </div>
            </div>
            
            {mosque.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{mosque.description}</p>
            )}
            
            {mosque.significance && (
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-purple-100 dark:border-purple-900 mb-3">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  <strong>Significance:</strong> {mosque.significance}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(mosque.name + ' ' + destination)}`, '_blank')}
              >
                <Navigation className="w-3 h-3 mr-1" />
                Directions
              </Button>
            </div>
          </div>
        ))}

        {mosques.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No mosque information available for this location
          </div>
        )}
      </CardContent>
    </Card>
  );
}