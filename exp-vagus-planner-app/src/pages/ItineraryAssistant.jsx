/**
 * Itinerary Assistant
 * Paste travel emails / text → AI parses → structured events preview → add to calendar with prayer reminders.
 * Uses: parseTravelMessage + getTravelItinerary backend functions.
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Mic, MicOff, Sparkles, Calendar, Clock, MapPin,
  Bell, Plus, Check, Loader2, Trash2, ChevronDown, ChevronUp,
  Moon, ArrowLeft, FileText, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ── Prayer reminder options ───────────────────────────────────────────────────
const PRAYER_REMINDER_OPTIONS = [
  { value: 'none',   label: 'No prayer reminders' },
  { value: 'fajr',   label: 'Fajr only' },
  { value: 'all',    label: 'All 5 prayers' },
  { value: 'jumu',   label: "Jumu'ah (Friday)" },
];

const EVENT_TYPE_COLORS = {
  flight:      'from-blue-500 to-sky-500',
  hotel:       'from-violet-500 to-purple-500',
  car:         'from-orange-400 to-amber-500',
  train:       'from-green-500 to-emerald-500',
  activity:    'from-pink-500 to-rose-500',
  other:       'from-slate-400 to-slate-500',
};

const EVENT_TYPE_ICONS = {
  flight:   '✈️',
  hotel:    '🏨',
  car:      '🚗',
  train:    '🚆',
  activity: '🎯',
  other:    '📌',
};

// ── Single extracted event card ───────────────────────────────────────────────
function EventCard({ event, onRemove, onToggle, selected }) {
  const [expanded, setExpanded] = useState(false);
  const gradient = EVENT_TYPE_COLORS[event.booking_type] || EVENT_TYPE_COLORS.other;
  const icon = EVENT_TYPE_ICONS[event.booking_type] || '📌';

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={cn(
        'rounded-2xl border transition-all overflow-hidden',
        selected ? 'border-teal-400 shadow-md shadow-teal-100 dark:shadow-teal-900/30' : 'border-slate-200 dark:border-slate-700'
      )}>
      <div className="flex items-start gap-3 p-4">
        {/* Select checkbox */}
        <button onClick={() => onToggle(event._id)}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
            selected ? 'bg-teal-500 border-teal-500' : 'border-slate-300 dark:border-slate-600'
          )}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Icon */}
        <span className="text-xl flex-shrink-0">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug text-sm">{event.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {event.event_date && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {event.event_date}
              </span>
            )}
            {event.start_time && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
              </span>
            )}
            {event.destination && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {event.destination}
              </span>
            )}
            <Badge className={cn('text-[9px] py-0 capitalize bg-gradient-to-r text-white border-0', gradient)}>
              {event.booking_type || 'event'}
            </Badge>
          </div>
          {/* Expand toggle for details */}
          {event.description && (
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 mt-2 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
          <AnimatePresence>
            {expanded && event.description && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed overflow-hidden">
                {event.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Remove */}
        <button onClick={() => onRemove(event._id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ItineraryAssistant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [phase, setPhase] = useState('input'); // input | parsing | review | saving | done
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [prayerOption, setPrayerOption] = useState('all');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
  });
  const userSettings = settings[0] || {};

  // ── Voice input ──────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice recognition not supported in this browser'); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    let final = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      const combined = final + interim;
      setTranscript(combined);
      setText(combined);
    };
    r.onend = () => setIsListening(false);
    r.onerror = () => { setIsListening(false); toast.error('Voice error — try again'); };
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };

  // ── Parse travel text ────────────────────────────────────────────────────
  const parseText = async () => {
    if (!text.trim()) { toast.error('Please enter some travel text first'); return; }
    setPhase('parsing');
    try {
      // Step 1: parse the raw message to get destination + dates
      const parseRes = await SDK.functions.invoke('parseTravelMessage', { message: text });
      const parsed = parseRes.data;

      // Step 2: get structured itinerary events
      const itinRes = await SDK.functions.invoke('getTravelItinerary', {
        message: text,
        destination: parsed?.destination || '',
        arrival_date: parsed?.arrival_date || '',
        departure_date: parsed?.departure_date || '',
      });
      const itinData = itinRes.data;

      // Combine: prefer itinerary events, fallback to a single parsed event
      let extractedEvents = [];
      if (itinData?.events?.length > 0) {
        extractedEvents = itinData.events;
      } else if (parsed?.destination) {
        // Build single trip event from parsed data
        extractedEvents = [{
          title: `Trip to ${parsed.destination}`,
          booking_type: parsed.booking_type || 'other',
          event_date: parsed.arrival_date || '',
          end_date: parsed.departure_date || '',
          destination: parsed.destination,
          description: text.substring(0, 200),
        }];
      } else {
        // Fallback: ask LLM directly
        const llmRes = await SDK.integrations.Core.InvokeLLM({
          prompt: `Extract all travel events from this text. Return an array of events with: title, booking_type (flight/hotel/car/train/activity/other), event_date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), destination, booking_reference, description.\n\nText: "${text}"`,
          response_json_schema: {
            type: 'object',
            properties: {
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    booking_type: { type: 'string' },
                    event_date: { type: 'string' },
                    start_time: { type: 'string' },
                    end_time: { type: 'string' },
                    destination: { type: 'string' },
                    booking_reference: { type: 'string' },
                    description: { type: 'string' },
                  }
                }
              }
            }
          }
        });
        extractedEvents = llmRes?.events || [];
      }

      if (!extractedEvents.length) {
        toast.error('Could not extract any events from that text. Try pasting a booking confirmation email.');
        setPhase('input');
        return;
      }

      // Tag each with a local ID and mark all selected
      const tagged = extractedEvents.map((e, i) => ({ ...e, _id: `ev-${Date.now()}-${i}` }));
      setEvents(tagged);
      setSelected(new Set(tagged.map(e => e._id)));
      setPhase('review');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse — ' + (err.message || 'unknown error'));
      setPhase('input');
    }
  };

  // ── Toggle selection ─────────────────────────────────────────────────────
  const toggleEvent = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const removeEvent = (id) => {
    setEvents(prev => prev.filter(e => e._id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  // ── Save to calendar ─────────────────────────────────────────────────────
  const saveToCalendar = async () => {
    const toSave = events.filter(e => selected.has(e._id));
    if (!toSave.length) { toast.error('Select at least one event'); return; }
    setPhase('saving');

    let saved = 0;
    const today = format(new Date(), 'yyyy-MM-dd');

    for (const ev of toSave) {
      try {
        const dateStr = ev.event_date || today;
        const startStr = ev.start_time ? `${dateStr}T${ev.start_time}:00` : `${dateStr}T09:00:00`;
        const endStr = ev.end_time ? `${dateStr}T${ev.end_time}:00` : `${dateStr}T10:00:00`;

        const reminders = [];
        // Default 1hr reminder
        reminders.push({ minutes_before: 60, type: 'notification', sent: false });

        // Prayer reminders
        if (prayerOption !== 'none' && userSettings?.prayer_enabled !== false) {
          const prayerMinsBefore = 10;
          if (prayerOption === 'fajr' || prayerOption === 'all') {
            reminders.push({ minutes_before: prayerMinsBefore, type: 'notification', sent: false, label: 'Fajr prayer' });
          }
          if (prayerOption === 'all') {
            ['Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(p => {
              reminders.push({ minutes_before: prayerMinsBefore, type: 'notification', sent: false, label: `${p} prayer` });
            });
          }
        }

        await SDK.entities.Event.create({
          title: ev.title,
          description: [ev.description, ev.booking_reference ? `Ref: ${ev.booking_reference}` : ''].filter(Boolean).join('\n'),
          start_date: startStr,
          end_date: endStr,
          location: ev.destination || '',
          category: ev.booking_type === 'flight' ? 'holiday' : 'personal',
          is_all_day: !ev.start_time,
          reminders,
          source: 'app',
        });
        saved++;
      } catch (err) {
        console.error('Failed to save event:', ev.title, err);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`Added ${saved} event${saved !== 1 ? 's' : ''} to your calendar!`);
    setPhase('done');
  };

  const reset = () => { setText(''); setEvents([]); setSelected(new Set()); setPhase('input'); setTranscript(''); };

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-5 shadow-xl">
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
            <div className="absolute top-2 right-10 w-16 h-16 bg-white/5 rounded-full" />
            <div className="relative flex items-start gap-4">
              <div className="p-2.5 bg-white/20 rounded-2xl flex-shrink-0">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black bg-white/15 text-white/80 px-2 py-0.5 rounded-full uppercase tracking-widest">AI Powered</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Itinerary Assistant</h1>
                <p className="text-sky-200 text-sm mt-0.5">Paste travel emails or speak — AI extracts events &amp; adds prayer reminders.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── INPUT PHASE ── */}
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

              {/* Voice input */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Voice or Text Input</span>
                </div>

                {/* Mic button */}
                <div className="flex items-center justify-center">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={isListening ? stopVoice : startVoice}
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all',
                      isListening ? 'bg-red-500 ring-4 ring-red-200' : 'bg-gradient-to-br from-sky-500 to-blue-600'
                    )}>
                    {isListening
                      ? <motion.div className="relative"><MicOff className="w-7 h-7 text-white" />
                          <motion.div className="absolute inset-0 rounded-full bg-red-400/30" animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }} /></motion.div>
                      : <Mic className="w-7 h-7 text-white" />}
                  </motion.button>
                </div>
                <p className="text-center text-xs text-slate-400">{isListening ? '🔴 Listening… tap to stop' : 'Tap to dictate your itinerary'}</p>

                {/* OR divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                  <span className="text-xs text-slate-300 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>

                {/* Text area */}
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Paste a travel confirmation email or describe your trip…\n\nExample:\n"Flight BA234 London to Dubai on 15 June 10:30am. Hotel Marriott Dubai, check-in 16 June. Return flight 22 June 6pm."`}
                  rows={7}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 leading-relaxed"
                />

                {/* Prayer reminder selector */}
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Prayer reminders during trip</span>
                  </div>
                  <select
                    value={prayerOption}
                    onChange={e => setPrayerOption(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-1.5 text-amber-800 dark:text-amber-300 font-medium focus:outline-none"
                  >
                    {PRAYER_REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <Button
                  onClick={parseText}
                  disabled={!text.trim()}
                  className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90 text-white font-bold gap-2 shadow-md">
                  <Sparkles className="w-4 h-4" /> Extract Events with AI
                </Button>
              </div>

              {/* Tips */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '✈️', label: 'Flights', desc: 'Booking confirmations' },
                  { icon: '🏨', label: 'Hotels', desc: 'Check-in details' },
                  { icon: '🎯', label: 'Activities', desc: 'Tours & transfers' },
                ].map(t => (
                  <div key={t.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <span className="text-xl">{t.icon}</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{t.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PARSING PHASE ── */}
          {phase === 'parsing' && (
            <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 dark:text-slate-100">Parsing your itinerary…</p>
                <p className="text-sm text-slate-400 mt-1">Extracting flights, hotels &amp; activities</p>
              </div>
              <div className="flex gap-1.5">
                {['Parse', 'Structure', 'Plan', 'Pray'].map((s, i) => (
                  <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                    className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-full text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                    {s}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── REVIEW PHASE ── */}
          {phase === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-slate-800 dark:text-slate-100">{events.length} Event{events.length !== 1 ? 's' : ''} Found</h2>
                  <p className="text-xs text-slate-400">{selected.size} selected for import</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(new Set(events.map(e => e._id)))} className="text-xs h-8">All</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} className="text-xs h-8">None</Button>
                </div>
              </div>

              {/* Prayer option badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  {PRAYER_REMINDER_OPTIONS.find(o => o.value === prayerOption)?.label} will be added
                </span>
              </div>

              {/* Event cards */}
              <div className="space-y-2">
                <AnimatePresence>
                  {events.map(ev => (
                    <EventCard key={ev._id} event={ev} selected={selected.has(ev._id)} onToggle={toggleEvent} onRemove={removeEvent} />
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1 h-11">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={saveToCalendar} disabled={!selected.size}
                  className="flex-2 h-11 bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 text-white font-bold gap-2 shadow-md">
                  <Calendar className="w-4 h-4" />
                  Add {selected.size} to Calendar
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── SAVING PHASE ── */}
          {phase === 'saving' && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Adding to your calendar…</p>
            </motion.div>
          )}

          {/* ── DONE PHASE ── */}
          {phase === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-5 py-12 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-xl">
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">All added! ✅</h2>
                <p className="text-slate-500 text-sm mt-1">Your travel events are in the calendar with prayer reminders.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} className="h-11">New Itinerary</Button>
                <Button onClick={() => navigate('/Calendar')} className="h-11 bg-gradient-to-r from-sky-500 to-blue-600 text-white gap-2">
                  <Calendar className="w-4 h-4" /> View Calendar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}