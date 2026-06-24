import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Moon, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EVENT_TYPES = [
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧', color: '#3ecfa0' },
  { key: 'prayer', label: 'Prayer', emoji: '🕌', color: '#E8B84B' },
  { key: 'school', label: 'School', emoji: '📚', color: '#38bdf8' },
  { key: 'appointment', label: 'Appointment', emoji: '🏥', color: '#f472b6' },
  { key: 'birthday', label: 'Birthday', emoji: '🎂', color: '#fb923c' },
  { key: 'holiday', label: 'Holiday', emoji: '✈️', color: '#a78bfa' },
  { key: 'other', label: 'Other', emoji: '📌', color: '#94a3b8' },
];

const PRAYER_TIMES_APPROX = [
  { name: 'Fajr', time: '05:30', emoji: '🌅' },
  { name: 'Dhuhr', time: '12:30', emoji: '☀️' },
  { name: 'Asr', time: '15:45', emoji: '🌤️' },
  { name: 'Maghrib', time: '18:20', emoji: '🌇' },
  { name: 'Isha', time: '20:00', emoji: '🌙' },
];

function AddEventModal({ onClose, onAdd, defaultDate }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState('family');
  const [allDay, setAllDay] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return toast.error('Enter a title');
    onAdd({ title: title.trim(), event_date: date, start_time: startTime, end_time: endTime, type, is_all_day: allDay });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-[#0a1f44] border border-white/15 rounded-3xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white text-base">Add Family Event</h3>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title…"
          className="bg-white/5 border-white/20 text-white placeholder:text-white/30" autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase mb-1 block">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-white/5 border-white/20 text-white" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase mb-1 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none h-9">
              {EVENT_TYPES.map(t => <option key={t.key} value={t.key} className="bg-[#071224]">{t.emoji} {t.label}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="accent-teal-400" />
          All day event
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="Start time"
              className="bg-white/5 border-white/20 text-white" />
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="End time"
              className="bg-white/5 border-white/20 text-white" />
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="outline" className="flex-1 border-white/15 text-white/60 bg-transparent">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold">Add Event</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function FamilyCalendarView({ groupId, user, memberEmails = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrayers, setShowPrayers] = useState(true);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['familyEvents', groupId],
    queryFn: () => base44.entities.FamilyCalendarEvent.filter({ family_group_id: groupId }),
    enabled: !!groupId,
  });

  // Also load prayer logs from family members
  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogsFamily'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 90),
  });

  const addEvent = useMutation({
    mutationFn: (data) => base44.entities.FamilyCalendarEvent.create({ ...data, family_group_id: groupId, owner_email: user?.email, owner_name: user?.full_name || user?.email }),
    onSuccess: () => { qc.invalidateQueries(['familyEvents', groupId]); toast.success('Event added!'); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id) => base44.entities.FamilyCalendarEvent.delete(id),
    onSuccess: () => qc.invalidateQueries(['familyEvents', groupId]),
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDow = startOfMonth(currentMonth).getDay(); // 0=Sun

  const getEventsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const familyEvts = events.filter(e => e.event_date === dateStr);
    if (!showPrayers) return familyEvts;
    // Inject prayer times as synthetic events
    const prayers = PRAYER_TIMES_APPROX.map(p => ({
      id: `prayer-${dateStr}-${p.name}`,
      title: p.name,
      event_date: dateStr,
      start_time: p.time,
      type: 'prayer',
      is_prayer: true,
      emoji: p.emoji,
    }));
    return [...prayers, ...familyEvts].sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
  };

  const selectedDayEvents = getEventsForDay(selectedDay);

  const getTypeConfig = (type) => EVENT_TYPES.find(t => t.key === type) || EVENT_TYPES[EVENT_TYPES.length - 1];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <h3 className="font-black text-white min-w-[150px] text-center">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrayers(p => !p)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${showPrayers ? 'bg-amber-400/15 border-amber-400/30 text-amber-300' : 'border-white/10 text-white/40'}`}>
            <Moon className="w-3 h-3" /> Prayers
          </button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1 h-8">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/8">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} className="h-14 border-r border-white/5" />)}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const familyEventCount = dayEvents.filter(e => !e.is_prayer).length;
            const hasPrayer = showPrayers;
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            return (
              <button key={day.toString()} onClick={() => setSelectedDay(day)}
                className={`h-14 border-r border-b border-white/5 flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-all relative ${isSelected ? 'bg-teal-500/20' : 'hover:bg-white/5'}`}>
                <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-amber-400 text-[#071224]' : isSelected ? 'text-teal-300' : 'text-white/60'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                  {hasPrayer && <div className="w-1 h-1 rounded-full bg-amber-400/60" />}
                  {Array.from({ length: Math.min(familyEventCount, 2) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-teal-400" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-white text-sm">{format(selectedDay, 'EEEE, MMMM d')}</h4>
          <button onClick={() => setShowAddModal(true)} className="text-xs text-teal-400 font-bold hover:underline">+ Add event</button>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-6 text-white/25 text-sm">No events. Add a family event!</div>
        ) : (
          <div className="space-y-1.5">
            {selectedDayEvents.map(evt => {
              const tc = getTypeConfig(evt.type);
              return (
                <motion.div key={evt.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-2xl group hover:border-white/15 transition-all">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: tc.color }} />
                  <span className="text-lg flex-shrink-0">{evt.is_prayer ? evt.emoji : tc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{evt.title}</p>
                    <p className="text-xs text-white/40">
                      {evt.start_time && evt.start_time}{evt.end_time && ` – ${evt.end_time}`}
                      {evt.is_all_day && 'All day'}
                      {!evt.is_prayer && evt.owner_name && ` · ${evt.owner_name}`}
                    </p>
                  </div>
                  {!evt.is_prayer && (
                    <button onClick={() => deleteEvent.mutate(evt.id)} className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming summary */}
      {events.length > 0 && (
        <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Upcoming Family Events</p>
          {events.filter(e => e.event_date >= format(new Date(), 'yyyy-MM-dd')).slice(0, 5).map(evt => {
            const tc = getTypeConfig(evt.type);
            return (
              <div key={evt.id} className="flex items-center gap-2 text-xs text-white/60">
                <span style={{ color: tc.color }}>{tc.emoji}</span>
                <span className="font-bold text-white/80">{evt.event_date}</span>
                <span>{evt.title}</span>
                <span className="text-white/30">by {evt.owner_name}</span>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddEventModal onClose={() => setShowAddModal(false)}
            onAdd={(data) => addEvent.mutate(data)}
            defaultDate={format(selectedDay, 'yyyy-MM-dd')} />
        )}
      </AnimatePresence>
    </div>
  );
}