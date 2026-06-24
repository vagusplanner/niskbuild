import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plane, MapPin, Moon, Utensils, Compass, Clock, Star,
  Loader2, ChevronDown, ChevronUp, Sparkles, Navigation,
  BookOpen, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRAYER_EMOJIS = { Fajr: '🌅', Sunrise: '🌄', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

function PrayerTimesCard({ times, qibla }) {
  return (
    <div className="bg-[#E8B84B]/6 border border-[#E8B84B]/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-[#E8B84B]" />
          <span className="text-sm font-black text-[#E8B84B]">Prayer Times</span>
        </div>
        {qibla != null && (
          <div className="flex items-center gap-1.5 bg-[#E8B84B]/10 border border-[#E8B84B]/20 rounded-xl px-3 py-1">
            <Compass className="w-3.5 h-3.5 text-[#E8B84B]" />
            <span className="text-xs font-bold text-[#E8B84B]">Qibla {qibla}°</span>
            {/* Simple compass needle */}
            <div className="relative w-4 h-4 flex-shrink-0">
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${qibla}deg)` }}
              >
                <div className="w-0.5 h-3.5 bg-gradient-to-t from-transparent via-[#E8B84B] to-[#E8B84B] rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(times).map(([name, time]) => (
          <div key={name} className="flex flex-col items-center bg-[#E8B84B]/5 rounded-xl py-2 px-1">
            <span className="text-base">{PRAYER_EMOJIS[name] || '🕌'}</span>
            <span className="text-[10px] font-black text-[#E8B84B] mt-0.5">{name}</span>
            <span className="text-[11px] text-white/70 font-mono">{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestaurantCard({ r }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-xl hover:border-white/15 transition-colors">
      <span className="text-xl flex-shrink-0">🍽️</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white leading-tight">{r.name}</p>
          {r.rating && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold flex-shrink-0">
              <Star className="w-2.5 h-2.5 fill-amber-400" />{r.rating}
            </span>
          )}
        </div>
        <p className="text-[11px] text-teal-400 font-semibold mt-0.5">
          {r.cuisine}{r.price_range && ` · ${r.price_range}`}
        </p>
        <p className="text-[11px] text-white/45 mt-1 leading-relaxed">{r.description}</p>
        {r.address && <p className="text-[10px] text-white/25 mt-1 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{r.address}</p>}
      </div>
    </div>
  );
}

function ActivityCard({ a }) {
  const categoryEmoji = {
    'museum': '🏛️', 'park': '🌳', 'shopping': '🛍️', 'culture': '🎭',
    'history': '🏰', 'beach': '🏖️', 'food': '🍴', 'religious': '🕌',
  };
  const emoji = Object.entries(categoryEmoji).find(([k]) => a.category?.toLowerCase().includes(k))?.[1] || '📍';

  return (
    <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-xl hover:border-white/15 transition-colors">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{a.name}</p>
        <p className="text-[11px] text-sky-400 font-semibold mt-0.5">{a.category}</p>
        <p className="text-[11px] text-white/45 mt-1 leading-relaxed">{a.description}</p>
        <div className="flex gap-3 mt-1.5">
          {a.duration && <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{a.duration}</span>}
          {a.suitable_for && <span className="text-[10px] text-white/30 flex items-center gap-1"><Users className="w-2.5 h-2.5" />{a.suitable_for}</span>}
        </div>
      </div>
    </div>
  );
}

export default function TravelItineraryBuilder() {
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('prayer');
  const [open, setOpen] = useState(false);

  // Fetch saved TravelContext records
  const { data: travelContexts = [] } = useQuery({
    queryKey: ['travelContexts'],
    queryFn: () => base44.entities.TravelContext.list('-created_date', 20),
  });

  const selectedCtx = travelContexts.find(c => c.id === selectedContextId);

  const handleBuild = async () => {
    if (!selectedCtx) return;
    setLoading(true);
    setItinerary(null);
    try {
      const res = await base44.functions.invoke('getTravelItinerary', {
        destination: selectedCtx.destination,
        lat: selectedCtx.destination_lat,
        lng: selectedCtx.destination_lng,
        date: selectedCtx.arrival_date || new Date().toISOString().split('T')[0],
      });
      setItinerary(res.data);
      toast.success(`✅ Itinerary ready for ${selectedCtx.destination}`);
    } catch (e) {
      toast.error('Could not load itinerary. Please try again.');
    }
    setLoading(false);
  };

  const TABS = [
    { id: 'prayer',     label: 'Prayer & Qibla', icon: Moon },
    { id: 'food',       label: 'Halal Food',      icon: Utensils },
    { id: 'activities', label: 'Activities',       icon: Star },
    { id: 'mosques',    label: 'Mosques',          icon: Compass },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <Navigation className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-black text-white">Islamic Travel Itinerary Builder</p>
          <p className="text-[11px] text-white/40">Prayer times, Qibla, halal food & activities for your trip</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="px-5 pb-5 pt-4 space-y-4">

              {/* Trip selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Select a trip from your bookings</p>
                {travelContexts.length === 0 ? (
                  <div className="p-4 bg-white/[0.02] border border-white/8 rounded-2xl text-center">
                    <Plane className="w-8 h-8 text-white/15 mx-auto mb-2" />
                    <p className="text-sm text-white/40">No trips found. Paste a flight receipt above to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {travelContexts.slice(0, 8).map(ctx => (
                      <button key={ctx.id}
                        onClick={() => { setSelectedContextId(ctx.id); setItinerary(null); }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                          selectedContextId === ctx.id
                            ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                        )}>
                        <MapPin className="w-3 h-3" />
                        {ctx.destination}
                        {ctx.arrival_date && <span className="font-normal text-white/30">· {format(new Date(ctx.arrival_date), 'd MMM')}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCtx && !itinerary && (
                <Button onClick={handleBuild} disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-teal-500 text-white font-bold h-10 gap-2 hover:opacity-90">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Building itinerary for {selectedCtx.destination}…</>
                    : <><Sparkles className="w-4 h-4" /> Build Islamic Itinerary for {selectedCtx.destination}</>
                  }
                </Button>
              )}

              {/* Itinerary results */}
              <AnimatePresence>
                {itinerary && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Destination header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-white">{itinerary.destination}</h3>
                        <p className="text-xs text-white/40">{format(new Date(itinerary.date), 'EEEE, d MMMM yyyy')}</p>
                      </div>
                      <button onClick={() => { setItinerary(null); setSelectedContextId(null); }}
                        className="text-xs text-white/30 hover:text-white border border-white/10 rounded-lg px-3 py-1 transition-colors">
                        Change
                      </button>
                    </div>

                    {/* Travel tips */}
                    {itinerary.travel_tips && (
                      <div className="flex gap-2 p-3 bg-sky-500/8 border border-sky-400/15 rounded-xl">
                        <BookOpen className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-white/60 leading-relaxed">{itinerary.travel_tips}</p>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
                      {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all',
                              activeTab === tab.id
                                ? 'bg-[#E8B84B] text-[#071224]'
                                : 'text-white/40 hover:text-white'
                            )}>
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab content */}
                    <div className="space-y-2">
                      {activeTab === 'prayer' && itinerary.prayer_times && (
                        <PrayerTimesCard times={itinerary.prayer_times} qibla={itinerary.qibla_direction} />
                      )}
                      {activeTab === 'prayer' && !itinerary.prayer_times && (
                        <p className="text-sm text-white/40 text-center py-4">Prayer times unavailable for this location.</p>
                      )}

                      {activeTab === 'food' && (
                        itinerary.restaurants?.length
                          ? itinerary.restaurants.map((r, i) => <RestaurantCard key={i} r={r} />)
                          : <p className="text-sm text-white/40 text-center py-4">No halal restaurant data available.</p>
                      )}

                      {activeTab === 'activities' && (
                        itinerary.activities?.length
                          ? itinerary.activities.map((a, i) => <ActivityCard key={i} a={a} />)
                          : <p className="text-sm text-white/40 text-center py-4">No activities data available.</p>
                      )}

                      {activeTab === 'mosques' && (
                        itinerary.mosques?.length ? (
                          itinerary.mosques.map((m, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-[#E8B84B]/5 border border-[#E8B84B]/15 rounded-xl">
                              <span className="text-xl">🕌</span>
                              <div>
                                <p className="text-sm font-bold text-[#E8B84B]">{m.name}</p>
                                {m.address && <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{m.address}</p>}
                                {m.note && <p className="text-[11px] text-white/35 mt-1">{m.note}</p>}
                              </div>
                            </div>
                          ))
                        ) : <p className="text-sm text-white/40 text-center py-4">No mosque data available.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}