import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

export default function QiblaFinderWidget() {
  const [qibla, setQibla] = useState(null);
  const [heading, setHeading] = useState(0);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  const getLocation = () => {
    setLoading(true);
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported on this device');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setLocation({ lat: latitude, lng: longitude });
        setQibla(calcQibla(latitude, longitude));
        setLoading(false);
        toast.success('Qibla direction calculated');
      },
      () => {
        toast.error('Could not get your location');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) return;
    const handler = (e) => {
      if (e.webkitCompassHeading != null) {
        setHeading(e.webkitCompassHeading); // iOS
      } else if (e.alpha != null) {
        setHeading(360 - e.alpha); // Android
      }
    };

    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      setNeedsPermission(true);
    } else {
      window.addEventListener('deviceorientation', handler);
    }
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === 'granted') {
        setNeedsPermission(false);
        window.addEventListener('deviceorientation', (e) => {
          if (e.webkitCompassHeading != null) setHeading(e.webkitCompassHeading);
          else if (e.alpha != null) setHeading(360 - e.alpha);
        });
      }
    }
  };

  const relativeAngle = qibla != null ? (qibla - heading + 360) % 360 : 0;
  const cardinal = (deg) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Qibla Finder</h3>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Direction to the Kaaba</p>
          </div>
          {qibla != null && (
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={getLocation} disabled={loading}>
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {qibla == null ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Compass className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Find the direction of the Kaaba from your location</p>
            <Button onClick={getLocation} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              {loading ? 'Locating…' : 'Find Qibla'}
            </Button>
            {needsPermission && (
              <Button variant="outline" size="sm" onClick={requestOrientationPermission} className="border-emerald-300 text-emerald-700">
                Enable Compass
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Compass dial */}
            <div className="relative w-44 h-44">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-white/80 to-emerald-50 dark:from-slate-800/80 dark:to-emerald-950/50 shadow-inner" />
              {/* Degree marks */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(d => (
                <div key={d} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${d}deg)` }}>
                  <div className="mt-2 w-0.5 h-3 bg-emerald-300 dark:bg-emerald-700 rounded-full" />
                </div>
              ))}
              {/* Cardinal labels */}
              {[{ l: 'N', r: 0 }, { l: 'E', r: 90 }, { l: 'S', r: 180 }, { l: 'W', r: 270 }].map(({ l, r }) => (
                <div key={l} className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${r}deg)` }}>
                  <span className="mt-5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300" style={{ transform: `rotate(-${r}deg)` }}>{l}</span>
                </div>
              ))}
              {/* Qibla arrow */}
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center"
                animate={{ rotate: relativeAngle }}
                transition={{ type: 'spring', stiffness: 60, damping: 14 }}
              >
                {/* Arrow up */}
                <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[28px] border-l-transparent border-r-transparent border-b-emerald-600 dark:border-b-emerald-400 -mt-10" />
                <div className="w-2 h-14 bg-gradient-to-b from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-600 rounded-b-full" />
              </motion.div>
              {/* Kaaba icon center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 bg-emerald-700 dark:bg-emerald-500 rounded-md flex items-center justify-center shadow-md">
                  <span className="text-white text-[8px] font-black">🕋</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{Math.round(qibla)}°</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{cardinal(qibla)} from your location</p>
              {location && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {location.lat.toFixed(3)}°, {location.lng.toFixed(3)}°
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}