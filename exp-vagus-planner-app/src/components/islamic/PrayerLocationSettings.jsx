import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Locate, Search, Clock, CheckCircle2, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CALCULATION_METHODS, ASR_METHODS, geocodeCity } from './prayerEngine';

const COMMON_TIMEZONES = [
  'Europe/London', 'Europe/Paris', 'Europe/Istanbul',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait',
  'Africa/Cairo', 'Africa/Casablanca',
  'Australia/Sydney', 'Pacific/Auckland',
];

export default function PrayerLocationSettings() {
  const queryClient = useQueryClient();
  const [cityQuery, setCityQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const s = settingsList[0] || {};

  const saveMutation = useMutation({
    mutationFn: (updates) => settingsList.length > 0
      ? SDK.entities.UserSettings.update(settingsList[0].id, updates)
      : SDK.entities.UserSettings.create(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Location settings saved');
    }
  });

  const set = (key, value) => saveMutation.mutate({ [key]: value });
  const setMany = (obj) => saveMutation.mutate(obj);

  // GPS detection
  const detectGPS = () => {
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        // Reverse geocode
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
          const country = data.address?.country || '';
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setMany({ latitude, longitude, location_city: city, location_country: country, timezone: tz });
        } catch {
          setMany({ latitude, longitude });
        }
        setDetectingGPS(false);
        toast.success('Location detected via GPS');
      },
      () => {
        setDetectingGPS(false);
        toast.error('Could not access GPS');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // City search
  const searchCity = async () => {
    if (!cityQuery.trim()) return;
    setGeocoding(true);
    setGeocodeResults([]);
    const results = await geocodeCity(cityQuery);
    setGeocodeResults(results.slice(0, 5));
    setGeocoding(false);
  };

  const selectResult = (r) => {
    setMany({
      latitude: r.lat,
      longitude: r.lng,
      location_city: r.name.split(',')[0].trim(),
      location_country: r.name.split(',').pop().trim(),
    });
    setGeocodeResults([]);
    setCityQuery('');
    toast.success('Location updated');
  };

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5 text-teal-600" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {s.location_city && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                <p className="font-semibold text-teal-900 dark:text-teal-200 text-sm">{s.location_city}{s.location_country ? `, ${s.location_country}` : ''}</p>
                {s.latitude && <p className="text-xs text-teal-600 dark:text-teal-400">{s.latitude.toFixed(4)}°, {s.longitude.toFixed(4)}°</p>}
              </div>
            </div>
          )}

          <Button
            onClick={detectGPS}
            disabled={detectingGPS}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {detectingGPS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Locate className="w-4 h-4 mr-2" />}
            Use My GPS Location
          </Button>

          <div className="flex gap-2">
            <Input
              placeholder="Search city…"
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchCity()}
              className="flex-1"
            />
            <Button variant="outline" onClick={searchCity} disabled={geocoding}>
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <AnimatePresence>
            {geocodeResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="border rounded-xl overflow-hidden divide-y dark:divide-slate-700 dark:border-slate-700 shadow-md">
                {geocodeResults.map((r, i) => (
                  <button key={i} onClick={() => selectResult(r)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 dark:hover:bg-teal-950/30 flex items-start gap-2 transition-colors">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-1">{r.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual lat/lng */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">Latitude</Label>
              <Input type="number" step="0.0001" placeholder="51.5074"
                value={s.latitude || ''} onChange={e => set('latitude', parseFloat(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Longitude</Label>
              <Input type="number" step="0.0001" placeholder="-0.1278"
                value={s.longitude || ''} onChange={e => set('longitude', parseFloat(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-5 h-5 text-teal-600" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Select value={s.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onValueChange={v => set('timezone', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full"
            onClick={() => set('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)}>
            Auto-detect from browser
          </Button>
        </CardContent>
      </Card>

      {/* Calculation Method — moved to bottom */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-teal-600" />
            Calculation Method
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Select value={s.prayer_method || 'MWL'} onValueChange={v => set('prayer_method', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {CALCULATION_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-slate-400">{m.region}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <Label className="text-sm mb-1 block">Asr Juristic Method</Label>
            <Select value={String(s.asr_method ?? '0')} onValueChange={v => set('asr_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASR_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Fine-tune offsets */}
          <div>
            <Label className="text-sm mb-2 block">Fine-tune offsets (minutes)</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                <div key={p} className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{p}</p>
                  <Input type="number" min="-30" max="30"
                    className="px-1 text-center text-sm h-8"
                    value={(s.prayer_time_offsets?.[p.toLowerCase()] ?? 0)}
                    onChange={e => set('prayer_time_offsets', {
                      ...(s.prayer_time_offsets || {}),
                      [p.toLowerCase()]: parseInt(e.target.value) || 0
                    })} />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Positive = later, negative = earlier</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}