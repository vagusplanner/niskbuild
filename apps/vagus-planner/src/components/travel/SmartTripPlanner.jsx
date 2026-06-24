import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, MapPin, Calendar, Package, List, Lightbulb, Clock,
  Loader2, ChevronDown, ChevronUp, Sparkles, CalendarCheck,
  Moon, Mail, Star, Check, Building2, UtensilsCrossed
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const ACTIVITY_ICONS = {
  morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙',
  transport: '✈️', food: '🍽️', activity: '🎯', sightseeing: '📸',
  mosque: '🕌', prayer: '🤲', halal: '🥩'
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PackingCategory({ category, items }) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState({});
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{Object.values(checked).filter(Boolean).length}/{items.length}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 grid grid-cols-2 gap-1.5">
              {items.map((item, i) => (
                <label key={i} className={cn("flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-lg transition-colors",
                  checked[i] ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                  <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked(c => ({ ...c, [i]: !c[i] }))} className="rounded accent-teal-500" />
                  {item}
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ItineraryDay({ day, halalMode }) {
  const [open, setOpen] = useState(day.day === 1);
  return (
    <div className="border border-[#E8B84B]/20 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a4a6e]/5 to-[#3ecfa0]/5 hover:from-[#1a4a6e]/10 hover:to-[#3ecfa0]/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {day.day}
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{day.title}</p>
            <p className="text-xs text-slate-400">{day.date}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 space-y-2">
              {day.activities?.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-base mt-0.5 flex-shrink-0">{ACTIVITY_ICONS[act.type] || '📍'}</span>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-[#1a7ab8] dark:text-[#4ec9f8]">{act.time}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{act.description}</p>
                    {act.halal_note && halalMode && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">🕌 {act.halal_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HalalSpotsPanel({ destination, data, loading, onFetch }) {
  const [subTab, setSubTab] = useState('restaurants');
  if (loading) return (
    <div className="text-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
      <p className="text-sm text-slate-500">Finding halal spots & mosques in {destination}…</p>
    </div>
  );
  if (!data) return (
    <div className="text-center py-10">
      <p className="text-3xl mb-3">🕌</p>
      <p className="text-sm text-slate-500 mb-4">Find halal restaurants, mosques & prayer spaces near your destination</p>
      <Button onClick={onFetch} className="bg-emerald-700 hover:bg-emerald-800">Find Halal Spots & Mosques</Button>
    </div>
  );
  const restaurants = data.halal_restaurants || data.restaurants || [];
  const mosques = data.mosques || data.prayer_locations || [];
  return (
    <div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
        {[['restaurants', `🍽️ Halal Restaurants (${restaurants.length})`, 'bg-emerald-600'],
          ['mosques', `🕌 Mosques (${mosques.length})`, 'bg-amber-600']].map(([id, label, active]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={cn("flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
              subTab === id ? `${active} text-white shadow-sm` : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {subTab === 'restaurants' && restaurants.map((r, i) => (
          <div key={i} className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{r.name}</p>
                <p className="text-xs text-slate-500 truncate">{r.address || r.vicinity}</p>
                {r.cuisine && <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">{r.cuisine}</Badge>}
              </div>
              {r.rating && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.rating}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {subTab === 'mosques' && mosques.map((m, i) => (
          <div key={i} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">🕌 {m.name}</p>
            <p className="text-xs text-slate-500">{m.address || m.vicinity}</p>
            {m.prayer_times && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{m.prayer_times}</p>}
            {m.distance && <p className="text-xs text-slate-400 mt-0.5">{m.distance}</p>}
          </div>
        ))}
        {subTab === 'restaurants' && restaurants.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No halal restaurants found nearby.</p>
        )}
        {subTab === 'mosques' && mosques.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No mosques found nearby.</p>
        )}
      </div>
    </div>
  );
}

function GmailBookingsPanel({ data, loading, onScan, onSaveToCalendar }) {
  const [saved, setSaved] = useState({});
  if (loading) return (
    <div className="text-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
      <p className="text-sm text-slate-500">Scanning Gmail for booking confirmations…</p>
    </div>
  );
  if (!data) return (
    <div className="text-center py-10">
      <Mail className="w-10 h-10 text-blue-300 mx-auto mb-3" />
      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Find flight & hotel confirmations</p>
      <p className="text-xs text-slate-400 mb-4">Scan your Gmail inbox for booking emails related to this trip</p>
      <Button onClick={onScan} variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
        <Mail className="w-4 h-4 mr-2" /> Scan Gmail Inbox
      </Button>
    </div>
  );
  const bookings = data.bookings || data.events || [];
  if (bookings.length === 0) return (
    <div className="text-center py-10">
      <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500 mb-1">No booking confirmations found</p>
      <p className="text-xs text-slate-400 mb-4">Try a broader search or check your Gmail</p>
      <Button onClick={onScan} variant="outline" size="sm" className="border-blue-200 text-blue-600">
        <Mail className="w-3.5 h-3.5 mr-1.5" /> Scan Again
      </Button>
    </div>
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3 font-medium">Found <strong>{bookings.length}</strong> booking confirmation{bookings.length !== 1 ? 's' : ''} in Gmail</p>
      {bookings.map((b, i) => (
        <div key={i} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/50">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{b.title || b.subject}</p>
              {b.date && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{b.date}{b.time ? ` at ${b.time}` : ''}</p>}
              {b.details && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.details}</p>}
              {b.reference && <p className="text-xs font-mono text-slate-400 mt-1">Ref: {b.reference}</p>}
            </div>
            <Button size="sm" disabled={saved[i]}
              onClick={async () => { await onSaveToCalendar(b); setSaved(s => ({ ...s, [i]: true })); }}
              className={cn("flex-shrink-0 text-xs h-7 px-2.5", saved[i] ? "bg-green-600 hover:bg-green-600" : "bg-[#1a7ab8] hover:bg-[#1a4a6e]")}>
              {saved[i] ? <><Check className="w-3 h-3 mr-1" />Saved</> : <>+ Calendar</>}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SmartTripPlanner() {
  const [form, setForm] = useState({
    destination: '', origin: 'London, UK', start_date: '', end_date: '',
    trip_type: 'leisure', num_travelers: '1', halal_mode: false
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [halalData, setHalalData] = useState(null);
  const [loadingHalal, setLoadingHalal] = useState(false);
  const [gmailData, setGmailData] = useState(null);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    if (!form.destination || !form.start_date || !form.end_date) {
      toast.error('Please fill in destination and travel dates'); return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be after start date'); return;
    }
    setLoading(true);
    setResult(null);
    const { data } = await base44.functions.invoke('smartTripPlanner', {
      destination: form.destination, origin: form.origin,
      start_date: form.start_date, end_date: form.end_date,
      trip_type: form.trip_type, num_travelers: parseInt(form.num_travelers),
      halal_mode: form.halal_mode,
    });
    setResult(data);
    if (data?.created_events_count > 0) {
      toast.success(`✅ Itinerary generated & ${data.created_events_count} calendar slots blocked!`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } else {
      toast.success('✅ Trip plan generated!');
    }
    setLoading(false);
    setActiveTab('itinerary');
  };

  const handleFindHalalSpots = async () => {
    if (!form.destination) { toast.error('Enter a destination first'); return; }
    setLoadingHalal(true);
    setHalalData(null);
    const { data } = await base44.functions.invoke('getHalalAndPrayerLocations', { location: form.destination });
    setHalalData(data);
    setActiveTab('halal');
    setLoadingHalal(false);
    toast.success(`🕌 Halal spots found in ${form.destination}!`);
  };

  const handleScanGmail = async () => {
    setLoadingGmail(true);
    setGmailData(null);
    const { data } = await base44.functions.invoke('scanTravelEmails', {
      destination: form.destination, start_date: form.start_date,
    });
    setGmailData(data);
    setActiveTab('gmail');
    setLoadingGmail(false);
    const count = data?.bookings?.length || data?.events?.length || 0;
    toast.success(`📧 Found ${count} booking confirmation${count !== 1 ? 's' : ''} in Gmail`);
  };

  const handleSaveBookingToCalendar = async (booking) => {
    await base44.entities.Event.create({
      title: booking.title || booking.subject,
      description: booking.details || '',
      start_date: `${booking.date || new Date().toISOString().split('T')[0]}T${booking.time || '00:00:00'}`,
      end_date: `${booking.end_date || booking.date || new Date().toISOString().split('T')[0]}T23:59:59`,
      category: 'holiday',
      location: form.destination,
      notes: `Booking Ref: ${booking.reference || 'N/A'}\nFrom Gmail: ${booking.from_email || ''}`,
    });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success('Saved to calendar!');
  };

  const tabs = [
    { id: 'itinerary', label: 'Itinerary', icon: List },
    { id: 'packing', label: 'Packing', icon: Package },
    { id: 'tips', label: 'Tips', icon: Lightbulb },
    ...(form.halal_mode ? [{ id: 'halal', label: 'Halal & Mosques', icon: Moon }] : []),
    { id: 'gmail', label: 'Gmail Bookings', icon: Mail },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E8B84B]/30 shadow-lg overflow-hidden">
      {/* Header */}
      <div className={cn("p-5 border-b-2 border-[#E8B84B]/50 transition-all",
        form.halal_mode
          ? "bg-gradient-to-r from-[#1a4a6e] via-emerald-900 to-[#1a4a6e]"
          : "bg-gradient-to-r from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0]")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center ring-2 ring-[#E8B84B]/60">
              {form.halal_mode ? <Moon className="w-5 h-5 text-[#E8B84B]" /> : <Sparkles className="w-5 h-5 text-[#E8B84B]" />}
            </div>
            <div>
              <h2 className="font-black text-white text-lg">Smart Trip Planner</h2>
              <p className="text-xs text-[#6de4be]">
                {form.halal_mode
                  ? 'Islamic Halal Mode — prayer-aware, halal-first itinerary'
                  : 'AI itinerary · packing list · calendar sync · Gmail bookings'}
              </p>
            </div>
          </div>
          {form.halal_mode && (
            <Badge className="bg-[#E8B84B] text-[#071224] font-bold text-xs hidden sm:flex">🕌 Islamic Mode</Badge>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Halal Mode Toggle */}
        <div className={cn("flex items-center justify-between p-3 rounded-xl border mb-5 transition-all",
          form.halal_mode
            ? "bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-[#E8B84B]/50"
            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🕌</span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Islamic Halal Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prayer-aware scheduling · Halal dining · Mosque finder</p>
            </div>
          </div>
          <Switch
            checked={form.halal_mode}
            onCheckedChange={v => setForm(f => ({
              ...f, halal_mode: v,
              trip_type: v && f.trip_type === 'leisure' ? 'halal_tourism' : (!v && f.trip_type === 'halal_tourism' ? 'leisure' : f.trip_type)
            }))}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="sm:col-span-2">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Destination</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a7ab8]" />
              <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder={form.halal_mode ? 'e.g. Istanbul, Turkey or Makkah, Saudi Arabia' : 'e.g. Tokyo, Japan'}
                className="pl-9 border-[#E8B84B]/30 focus:border-[#1a7ab8]" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Origin / Home City</Label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3ecfa0]" />
              <Input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                placeholder="e.g. London, UK" className="pl-9 border-[#E8B84B]/30 focus:border-[#1a7ab8]" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Trip Type</Label>
            <Select value={form.trip_type} onValueChange={v => setForm(f => ({ ...f, trip_type: v }))}>
              <SelectTrigger className="border-[#E8B84B]/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="leisure">🏖️ Leisure / Holiday</SelectItem>
                <SelectItem value="business">💼 Business</SelectItem>
                <SelectItem value="adventure">🏔️ Adventure</SelectItem>
                <SelectItem value="cultural">🎭 Cultural & Historical</SelectItem>
                <SelectItem value="family">👨‍👩‍👧 Family</SelectItem>
                <SelectItem value="honeymoon">💑 Honeymoon / Romance</SelectItem>
                {form.halal_mode && <>
                  <SelectItem value="halal_tourism">🌙 Halal Tourism</SelectItem>
                  <SelectItem value="hajj_umrah">🕋 Hajj & Umrah</SelectItem>
                  <SelectItem value="spiritual">🤲 Spiritual Journey</SelectItem>
                  <SelectItem value="ziyarat">🕌 Ziyarat (Sacred Sites)</SelectItem>
                  <SelectItem value="family_halal">👨‍👩‍👧 Family Halal Holiday</SelectItem>
                  <SelectItem value="halal_solo">🧳 Halal Solo Travel</SelectItem>
                </>}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Departure Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a7ab8]" />
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="pl-9 border-[#E8B84B]/30 focus:border-[#1a7ab8]" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Return Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3ecfa0]" />
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="pl-9 border-[#E8B84B]/30 focus:border-[#1a7ab8]" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Travelers</Label>
            <Select value={form.num_travelers} onValueChange={v => setForm(f => ({ ...f, num_travelers: v }))}>
              <SelectTrigger className="border-[#E8B84B]/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'traveler' : 'travelers'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-5">
          <Button onClick={handleGenerate} disabled={loading}
            className="w-full bg-gradient-to-r from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0] hover:opacity-90 border border-[#E8B84B]/40 font-bold text-base py-3 h-auto">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating your trip plan…</>
              : <><Sparkles className="w-4 h-4 mr-2" />Generate Smart Trip Plan</>}
          </Button>

          <div className={cn("grid gap-2", form.halal_mode ? "grid-cols-2" : "grid-cols-1")}>
            {form.halal_mode && (
              <Button onClick={handleFindHalalSpots} disabled={loadingHalal || !form.destination} variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 text-sm h-9">
                {loadingHalal ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <span className="mr-1.5">🕌</span>}
                Find Halal & Mosques
              </Button>
            )}
            <Button onClick={handleScanGmail} disabled={loadingGmail} variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 text-sm h-9">
              {loadingGmail ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
              Scan Gmail Bookings
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#1a4a6e]/8 to-[#3ecfa0]/8 border border-[#E8B84B]/20">
              <Loader2 className="w-5 h-5 animate-spin text-[#1a7ab8]" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI is planning your trip…</p>
                <p className="text-xs text-slate-400">
                  {form.halal_mode
                    ? 'Scheduling around prayer times · finding halal dining · Islamic sites'
                    : 'Generating itinerary, packing list & calendar events'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {(result || halalData || gmailData) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {result?.created_events_count > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#3ecfa0]/10 to-[#1a7ab8]/10 border border-[#3ecfa0]/30 mb-4">
                  <CalendarCheck className="w-5 h-5 text-[#3ecfa0] flex-shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-bold text-[#1a7ab8]">{result.created_events_count} calendar events</span> created — travel time & key activities are blocked in your calendar.
                  </p>
                </div>
              )}
              {result?.estimated_travel_time_hours && (
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                  <Clock className="w-4 h-4 text-[#E8B84B]" />
                  <span>Est. travel time: <strong className="text-slate-700 dark:text-slate-200">{result.estimated_travel_time_hours}h one-way</strong> from {form.origin}</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 overflow-x-auto">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={cn("flex-shrink-0 flex items-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                        isActive ? "bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'itinerary' && result && (
                <div className="space-y-2">
                  {result.itinerary?.map((day, i) => <ItineraryDay key={i} day={day} halalMode={form.halal_mode} />)}
                </div>
              )}
              {activeTab === 'packing' && result && (
                <div className="space-y-2">
                  {result.packing_list?.map((cat, i) => <PackingCategory key={i} category={cat.category} items={cat.items} />)}
                </div>
              )}
              {activeTab === 'tips' && result && (
                <div className="space-y-2">
                  {result.travel_tips?.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/80 to-yellow-50/60 dark:from-amber-950/20 dark:to-yellow-950/20 border border-[#E8B84B]/20">
                      <span className="text-[#E8B84B] font-black text-sm flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'halal' && (
                <HalalSpotsPanel
                  destination={form.destination}
                  data={halalData}
                  loading={loadingHalal}
                  onFetch={handleFindHalalSpots}
                />
              )}
              {activeTab === 'gmail' && (
                <GmailBookingsPanel
                  data={gmailData}
                  loading={loadingGmail}
                  onScan={handleScanGmail}
                  onSaveToCalendar={handleSaveBookingToCalendar}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}