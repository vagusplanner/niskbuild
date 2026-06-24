import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles, Plane, Hotel, Car, Train, Calendar, MapPin,
  CheckCircle2, ChevronDown, ChevronUp, Utensils, Loader2, X, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const TYPE_ICONS = {
  flight:   { icon: Plane,     color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20' },
  hotel:    { icon: Hotel,     color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
  car:      { icon: Car,       color: 'text-teal-400',   bg: 'bg-teal-400/10 border-teal-400/20' },
  train:    { icon: Train,     color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  activity: { icon: MapPin,    color: 'text-rose-400',   bg: 'bg-rose-400/10 border-rose-400/20' },
  other:    { icon: Calendar,  color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20' },
};

async function fetchHalalNearby(lat, lng, destination) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Find 5 highly-rated halal restaurants near ${destination} (lat: ${lat}, lng: ${lng}). Return real restaurant names with brief description, cuisine type, and approximate address.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        restaurants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              cuisine: { type: 'string' },
              address: { type: 'string' },
              rating: { type: 'number' },
              note: { type: 'string' }
            }
          }
        }
      }
    }
  });
  return res?.restaurants || [];
}

function BookingCard({ booking, contextId }) {
  const [showHalal, setShowHalal] = useState(false);
  const [halalList, setHalalList] = useState(null);
  const [loadingHalal, setLoadingHalal] = useState(false);
  const cfg = TYPE_ICONS[booking.booking_type] || TYPE_ICONS.other;
  const Icon = cfg.icon;

  const handleHalal = async () => {
    setShowHalal(v => !v);
    if (!halalList && booking.destination) {
      setLoadingHalal(true);
      try {
        const list = await fetchHalalNearby(
          booking.destination_lat || 0,
          booking.destination_lng || 0,
          booking.destination
        );
        setHalalList(list);
        // Cache on context
        if (contextId) {
          await base44.entities.TravelContext.update(contextId, {
            halal_cache: JSON.stringify(list)
          });
        }
      } catch { toast.error('Could not load halal restaurants'); }
      setLoadingHalal(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 space-y-2 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl bg-white/10 flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white">{booking.title}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-white/50">
            {booking.destination && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.destination}</span>
            )}
            {booking.arrival_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                {format(new Date(booking.arrival_date), 'd MMM yyyy')}
                {booking.arrival_time && ` · ${booking.arrival_time}`}
              </span>
            )}
            {booking.reference && (
              <span className="font-mono text-white/40">Ref: {booking.reference}</span>
            )}
          </div>
          {booking.notes && <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{booking.notes}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span className="text-[10px] text-teal-400 font-bold">Added to calendar</span>
        </div>
      </div>

      {/* Halal nearby button */}
      {booking.destination && (
        <div className="pt-1">
          <button onClick={handleHalal}
            className="flex items-center gap-2 text-xs font-bold text-[#E8B84B] hover:text-[#f0c060] transition-colors">
            <Utensils className="w-3.5 h-3.5" />
            Halal restaurants near {booking.destination}
            {showHalal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {showHalal && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2">
                {loadingHalal ? (
                  <div className="flex items-center gap-2 p-3 text-white/40 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding halal restaurants…
                  </div>
                ) : halalList?.length ? (
                  <div className="space-y-1.5 p-1">
                    {halalList.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-[#E8B84B]/8 border border-[#E8B84B]/15 rounded-xl">
                        <span className="text-sm flex-shrink-0">🍽️</span>
                        <div>
                          <p className="text-xs font-bold text-[#E8B84B]">{r.name}
                            {r.rating && <span className="ml-1.5 text-white/40 font-normal">⭐ {r.rating}</span>}
                          </p>
                          <p className="text-[10px] text-white/50">{r.cuisine} · {r.address}</p>
                          {r.note && <p className="text-[10px] text-white/35 mt-0.5">{r.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 p-2">No results found. Try the Halal Finder in the sidebar.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function TravelMessageParser() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const handleParse = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('parseTravelMessage', { message });
      setResult(res.data);
      if (res.data?.events?.length > 0) {
        qc.invalidateQueries(['events']);
        qc.invalidateQueries(['holidays']);
        toast.success(`✅ ${res.data.message}`);
      } else {
        toast.info(res.data?.message || 'No bookings detected.');
      }
    } catch (e) {
      toast.error('Failed to parse message. Please try again.');
    }
    setLoading(false);
  };

  const handleClear = () => { setMessage(''); setResult(null); };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
      {/* Header toggle */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-teal-500/20 border border-sky-400/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-sky-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-black text-white">Paste Travel Message or Receipt</p>
          <p className="text-[11px] text-white/40">AI reads flight confirmations, hotel bookings, WhatsApp messages & more</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
              {/* Text input */}
              {!result ? (
                <>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Paste anything here — e.g.\n\n"Your flight EK101 London Heathrow → Dubai on 15 May 2026 at 14:30 is confirmed. Booking ref: ABC123."\n\nOr a hotel booking, car hire, or any travel-related WhatsApp message.`}
                    rows={7}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-sky-400/40 leading-relaxed"
                  />
                  <div className="flex gap-2">
                    {message.trim() && (
                      <Button onClick={handleClear} variant="outline" size="sm"
                        className="border-white/15 text-white/40 bg-transparent gap-1">
                        <X className="w-3.5 h-3.5" /> Clear
                      </Button>
                    )}
                    <Button onClick={handleParse} disabled={!message.trim() || loading}
                      className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold gap-2 h-10 hover:opacity-90">
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</>
                        : <><Sparkles className="w-4 h-4" /> Parse & Add to Calendar</>
                      }
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/25 text-center">
                    AI extracts booking details, adds calendar events with travel time buffers, and enables halal restaurant suggestions at your destination.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white/70">
                      {result.bookings?.length > 0
                        ? `Found ${result.bookings.length} booking${result.bookings.length > 1 ? 's' : ''} · ${result.events?.length || 0} calendar event${result.events?.length !== 1 ? 's' : ''} created`
                        : 'No bookings detected'}
                    </p>
                    <button onClick={handleClear}
                      className="text-xs text-white/30 hover:text-white transition-colors flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Parse another
                    </button>
                  </div>

                  {/* Booking cards */}
                  {result.bookings?.length > 0 ? (
                    result.bookings.map((b, i) => (
                      <BookingCard
                        key={i}
                        booking={b}
                        contextId={result.contexts?.[i]?.id}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white/[0.02] border border-white/8 rounded-2xl">
                      <p className="text-white/40 text-sm">No travel bookings found in the message.</p>
                      <p className="text-white/25 text-xs mt-1">Try pasting a flight or hotel confirmation email.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}