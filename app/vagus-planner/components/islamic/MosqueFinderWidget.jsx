import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function MosqueFinderWidget() {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const findNearbyMosques = () => {
    setLoading(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          
          // Use Google Places API or similar to find mosques
          // For now, using a mock implementation
          try {
            const mockMosques = [
              {
                name: 'Central Mosque',
                address: '123 Main Street',
                distance: '0.5 km',
                prayerTimes: true
              },
              {
                name: 'Islamic Center',
                address: '456 Park Avenue',
                distance: '1.2 km',
                prayerTimes: true
              },
              {
                name: 'Community Masjid',
                address: '789 Oak Road',
                distance: '2.1 km',
                prayerTimes: false
              }
            ];
            
            setMosques(mockMosques);
            toast.success(`Found ${mockMosques.length} mosques nearby`);
          } catch (error) {
            toast.error('Failed to find mosques');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setLoading(false);
          toast.error('Could not get location');
        }
      );
    } else {
      setLoading(false);
      toast.error('Geolocation not supported');
    }
  };

  const openInMaps = (mosque) => {
    if (location) {
      const url = `https://www.google.com/maps/dir/${location.lat},${location.lng}/${encodeURIComponent(mosque.address)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Nearby Mosques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mosques.length === 0 ? (
          <div className="text-center space-y-4 py-8">
            <MapPin className="w-12 h-12 mx-auto text-green-600" />
            <p className="text-sm text-slate-600">Find mosques near you for prayer</p>
            <Button 
              onClick={findNearbyMosques}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Find Mosques
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {mosques.map((mosque, idx) => (
              <div 
                key={idx}
                className="p-4 bg-white rounded-lg border border-green-200 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{mosque.name}</h4>
                    <p className="text-sm text-slate-600">{mosque.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-green-600 font-medium">{mosque.distance}</span>
                      {mosque.prayerTimes && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Prayer Times Available
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInMaps(mosque)}
                    className="ml-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              onClick={findNearbyMosques}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}