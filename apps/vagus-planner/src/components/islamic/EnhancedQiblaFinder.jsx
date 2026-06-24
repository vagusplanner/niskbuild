import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Compass, MapPin, Loader2, Navigation, RotateCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calcQibla(lat, lng) {
  const φ1 = lat * Math.PI / 180;
  const φ2 = KAABA_LAT * Math.PI / 180;
  const Δλ = (KAABA_LNG - lng) * Math.PI / 180;
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function distanceKm(lat1, lng1) {
  const R = 6371;
  const dLat = (KAABA_LAT - lat1) * Math.PI / 180;
  const dLng = (KAABA_LNG - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(KAABA_LAT * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function EnhancedQiblaFinder() {
  const [qibla, setQibla] = useState(null);
  const [heading, setHeading] = useState(0);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compassSupported, setCompassSupported] = useState(false);
  const [aligned, setAligned] = useState(false);
  const orientationRef = useRef(null);

  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  const settings = userSettings[0];

  // Auto-use stored location from settings
  useEffect(() => {
    if (settings?.latitude && settings?.longitude) {
      const lat = settings.latitude;
      const lng = settings.longitude;
      setLocation({ lat, lng });
      setQibla(calcQibla(lat, lng));
    }
  }, [settings]);

  // Device orientation for compass
  useEffect(() => {
    const handleOrientation = (e) => {
      let angle = e.webkitCompassHeading ?? (e.alpha ? (360 - e.alpha) : 0);
      setHeading(angle);
      setCompassSupported(true);
    };

    const requestPermission = async () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        } catch { /* desktop fallback */ }
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    };

    requestPermission();
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  // Detect alignment
  useEffect(() => {
    if (qibla === null) return;
    const diff = Math.abs(((qibla - heading) + 360) % 360);
    setAligned(diff < 10 || diff > 350);
  }, [heading, qibla]);

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setLocation({ lat, lng });
        setQibla(calcQibla(lat, lng));
        setLoading(false);
        toast.success('Qibla direction calculated');
      },
      () => {
        setLoading(false);
        toast.error('Could not access location');
      },
      { enableHighAccuracy: true }
    );
  };

  const relativeAngle = qibla !== null ? ((qibla - heading + 360) % 360) : 0;
  const distance = location ? distanceKm(location.lat, location.lng) : null;

  const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassDir = DIRECTIONS[Math.round(((qibla || 0) / 45)) % 8];

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5" />
            <h3 className="font-bold text-lg">Qibla Finder</h3>
          </div>
          {qibla !== null && (
            <Badge className={`${aligned ? 'bg-green-400 text-green-900' : 'bg-white/20 text-white'} font-semibold transition-colors`}>
              {aligned ? '✓ Aligned!' : `${Math.round(qibla)}° ${compassDir}`}
            </Badge>
          )}
        </div>
        {distance && (
          <p className="text-white/70 text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {distance.toLocaleString()} km to Makkah
          </p>
        )}
      </div>

      <CardContent className="p-5">
        {qibla === null ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Compass className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">Find the direction to Kaaba</p>
              <p className="text-xs text-slate-500 mt-1">Allow location access for accurate direction</p>
            </div>
            <Button onClick={getLocation} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
              Get Qibla Direction
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Compass */}
            <div className="flex flex-col items-center">
              <div className="relative w-52 h-52">
                {/* Outer ring */}
                <div className={`absolute inset-0 rounded-full border-4 transition-colors duration-500 ${aligned ? 'border-green-500 shadow-lg shadow-green-200' : 'border-emerald-300'}`} />
                {/* Degree markers */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                  {[...Array(36)].map((_, i) => {
                    const angle = (i * 10) * Math.PI / 180;
                    const isMajor = i % 9 === 0;
                    const r1 = isMajor ? 90 : 93;
                    const r2 = 97;
                    return (
                      <line key={i}
                        x1={100 + r1 * Math.sin(angle)} y1={100 - r1 * Math.cos(angle)}
                        x2={100 + r2 * Math.sin(angle)} y2={100 - r2 * Math.cos(angle)}
                        stroke={isMajor ? '#0d9488' : '#d1fae5'} strokeWidth={isMajor ? 2 : 1}
                      />
                    );
                  })}
                </svg>
                {/* Cardinal labels */}
                {[['N',0],['E',90],['S',180],['W',270]].map(([d, deg]) => {
                  const r = 78;
                  const a = deg * Math.PI / 180;
                  return (
                    <div key={d} className="absolute text-[11px] font-bold text-slate-600 dark:text-slate-300 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${50 + r * Math.sin(a) / 104 * 100}%`, top: `${50 - r * Math.cos(a) / 104 * 100}%` }}>
                      {d}
                    </div>
                  );
                })}
                {/* Background */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20" />
                {/* Rotating arrow pointing to Qibla */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ rotate: relativeAngle }}
                  transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                >
                  <div className="relative h-36 flex flex-col items-center">
                    {/* Kaaba icon at tip */}
                    <div className="text-base mb-0.5">🕋</div>
                    <div className="w-1.5 flex-1 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full shadow" />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mt-0.5" />
                  </div>
                </motion.div>
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg transition-colors duration-300 ${aligned ? 'bg-green-500' : 'bg-emerald-600'}`} />
                </div>
              </div>

              <AnimatePresence>
                {aligned && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-3 px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold"
                  >
                    ✓ Facing Qibla
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{Math.round(qibla)}°</p>
                <p className="text-[10px] text-slate-500">Qibla</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{compassDir}</p>
                <p className="text-[10px] text-slate-500">Direction</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{distance ? `${Math.round(distance/100)/10}k` : '—'}</p>
                <p className="text-[10px] text-slate-500">km away</p>
              </div>
            </div>

            {!compassSupported && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                ℹ️ Compass not detected – arrow shows absolute direction
              </p>
            )}

            <Button variant="outline" size="sm" className="w-full" onClick={getLocation} disabled={loading}>
              <RotateCw className="w-4 h-4 mr-2" /> Recalculate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}