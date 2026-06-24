import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export default function QiblaFinder() {
  const [qiblaDirection, setQiblaDirection] = useState(null);
  const [userHeading, setUserHeading] = useState(0);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateQibla = (lat, lng) => {
    const φ1 = lat * Math.PI / 180;
    const φ2 = KAABA_LAT * Math.PI / 180;
    const Δλ = (KAABA_LNG - lng) * Math.PI / 180;

    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    return (θ * 180 / Math.PI + 360) % 360;
  };

  const getLocation = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          const qibla = calculateQibla(latitude, longitude);
          setQiblaDirection(qibla);
          setLoading(false);
          toast.success('Qibla direction found!');
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

  useEffect(() => {
    if ('DeviceOrientationEvent' in window) {
      const handleOrientation = (event) => {
        if (event.alpha !== null) {
          setUserHeading(360 - event.alpha);
        }
      };
      
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, []);

  const relativeAngle = qiblaDirection !== null 
    ? ((qiblaDirection - userHeading + 360) % 360)
    : 0;

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-600" />
          Qibla Direction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qiblaDirection ? (
          <div className="text-center space-y-4 py-8">
            <MapPin className="w-12 h-12 mx-auto text-emerald-600" />
            <p className="text-sm text-slate-600">Find the direction to Kaaba</p>
            <Button 
              onClick={getLocation}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Get Qibla Direction
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-48 h-48 mx-auto">
              {/* Compass Background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-emerald-600" />
              
              {/* Direction Markers */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs font-bold text-slate-700 absolute top-2">N</div>
                <div className="text-xs font-bold text-slate-700 absolute right-2">E</div>
                <div className="text-xs font-bold text-slate-700 absolute bottom-2">S</div>
                <div className="text-xs font-bold text-slate-700 absolute left-2">W</div>
              </div>

              {/* Qibla Arrow */}
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                style={{ transform: `rotate(${relativeAngle}deg)` }}
              >
                <div className="w-1 h-20 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full shadow-lg" 
                     style={{ transformOrigin: 'center bottom' }} />
                <div className="absolute w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-emerald-600"
                     style={{ top: '35%' }} />
              </div>

              {/* Center Dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 bg-emerald-600 rounded-full shadow-lg" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-emerald-700">
                {Math.round(qiblaDirection)}°
              </p>
              <p className="text-sm text-slate-600">
                {location && `${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`}
              </p>
              <Button 
                onClick={getLocation}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}