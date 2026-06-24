import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, Check, Plane, Hotel, ChevronDown, ChevronUp, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const BOOKING_ICONS = {
  flight: '✈️', hotel: '🏨', car: '🚗', train: '🚆',
  cruise: '🚢', tour: '🗺️', restaurant: '🍽️', activity: '🎫'
};

function BookingItem({ booking, onSave, saved }) {
  const [expanded, setExpanded] = useState(false);
  const type = booking.type?.toLowerCase() || 'flight';
  const icon = BOOKING_ICONS[type] || '📋';

  return (
    <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/60 overflow-hidden bg-blue-50/50 dark:bg-blue-950/10">
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{booking.title || booking.subject}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {booking.date && <span className="text-xs text-blue-600 dark:text-blue-400">{booking.date}</span>}
            {booking.reference && <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{booking.reference}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <Button size="sm" disabled={saved}
            onClick={() => onSave(booking)}
            className={cn("text-xs h-7 px-2.5", saved ? "bg-green-600 hover:bg-green-600" : "bg-[#1a7ab8] hover:bg-[#1a4a6e]")}>
            {saved ? <><Check className="w-3 h-3 mr-1" />Saved</> : <>+ Calendar</>}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-0 border-t border-blue-200/40 dark:border-blue-900/40">
              {booking.details && <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{booking.details}</p>}
              {booking.from_email && <p className="text-xs text-slate-400 mt-1">From: {booking.from_email}</p>}
              {booking.passengers && <p className="text-xs text-slate-500 mt-1">Passengers: {booking.passengers}</p>}
              {booking.price && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Price: {booking.price}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GmailBookingScanner({ holiday }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState({});
  const queryClient = useQueryClient();

  const handleScan = async () => {
    setLoading(true);
    setData(null);
    const { data: result } = await base44.functions.invoke('scanTravelEmails', {
      destination: holiday?.destination || '',
      start_date: holiday?.start_date || '',
      end_date: holiday?.end_date || '',
    });
    setData(result);
    setLoading(false);
    const count = result?.bookings?.length || result?.events?.length || 0;
    toast.success(`Found ${count} booking confirmation${count !== 1 ? 's' : ''} in Gmail`);
  };

  const handleSaveToCalendar = async (booking, idx) => {
    await base44.entities.Event.create({
      title: booking.title || booking.subject,
      description: booking.details || '',
      start_date: `${booking.date || holiday?.start_date || new Date().toISOString().split('T')[0]}T${booking.time || '00:00:00'}`,
      end_date: `${booking.end_date || holiday?.end_date || booking.date || new Date().toISOString().split('T')[0]}T23:59:59`,
      category: 'holiday',
      location: holiday?.destination || '',
      notes: `Booking Ref: ${booking.reference || 'N/A'}\nFrom Gmail: ${booking.from_email || ''}`,
    });
    // Also update holiday with booking info
    if (holiday?.id && booking.reference) {
      const note = `${booking.title} — Ref: ${booking.reference}`;
      await base44.entities.Holiday.update(holiday.id, {
        notes: holiday.notes ? `${holiday.notes}\n${note}` : note,
        ...(booking.type === 'flight' ? { flight_details: booking.details } : {}),
        ...(booking.type === 'hotel' ? { accommodation: booking.details } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    }
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setSaved(s => ({ ...s, [idx]: true }));
    toast.success('Saved to calendar & trip!');
  };

  const bookings = data?.bookings || data?.events || [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200/50 dark:border-blue-900/40 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-blue-200/40 dark:border-blue-900/40">
        <div className="flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Gmail Booking Scanner</p>
            <p className="text-xs text-slate-500">Flights, hotels & booking confirmations</p>
          </div>
        </div>
        <Button onClick={handleScan} disabled={loading} size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Scanning…</> : <><Mail className="w-3.5 h-3.5 mr-1.5" />Scan Gmail</>}
        </Button>
      </div>

      <div className="p-4">
        {!loading && !data && (
          <div className="text-center py-6">
            <div className="flex justify-center gap-3 mb-3 text-2xl">
              <span>✈️</span><span>🏨</span><span>📧</span>
            </div>
            <p className="text-sm text-slate-500 mb-1">
              {holiday ? `Scan Gmail for bookings related to ${holiday.destination}` : 'Scan Gmail for travel booking confirmations'}
            </p>
            <p className="text-xs text-slate-400">Finds flights, hotels, car rentals & more</p>
          </div>
        )}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Scanning Gmail for booking confirmations…</p>
          </div>
        )}
        {data && bookings.length === 0 && (
          <div className="text-center py-6">
            <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No booking confirmations found in Gmail</p>
            <p className="text-xs text-slate-400 mt-1">Try scanning again after receiving confirmation emails</p>
          </div>
        )}
        {data && bookings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-slate-500 font-medium">
                Found <strong>{bookings.length}</strong> booking confirmation{bookings.length !== 1 ? 's' : ''} — save them to your calendar & trip
              </p>
            </div>
            {bookings.map((b, i) => (
              <BookingItem key={i} booking={b} saved={!!saved[i]} onSave={(bk) => handleSaveToCalendar(bk, i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}