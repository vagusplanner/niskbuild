import React, { useState, useMemo, useCallback } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Clock, Sun, Sunrise,
  Sunset, Moon, Sparkles, AlignLeft, Circle, CheckCircle2, RefreshCw,
  GripVertical, Timer, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PomodoroTimer from '@/components/planner/PomodoroTimer';
import PlanMyDayPanel from '@/components/planner/PlanMyDayPanel';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5am–10pm

const PRIORITIES = [
  { key: 'high',   label: 'High',   color: 'text-red-400',   dot: 'bg-red-400' },
  { key: 'medium', label: 'Medium', color: 'text-amber-400', dot: 'bg-amber-400' },
  { key: 'low',    label: 'Low',    color: 'text-slate-400', dot: 'bg-slate-400' },
];

const CATEGORIES = [
  { key: 'work',     emoji: '💼', color: '#2563eb' },
  { key: 'personal', emoji: '⭐', color: '#0284c7' },
  { key: 'health',   emoji: '💪', color: '#0d9488' },
  { key: 'prayer',   emoji: '🕌', color: '#E8B84B' },
  { key: 'family',   emoji: '👨‍👩‍👧', color: '#7c3aed' },
  { key: 'other',    emoji: '📌', color: '#64748b' },
];

const RECURRENCE_OPTIONS = [
  { key: 'none',    label: 'Once' },
  { key: 'daily',   label: 'Daily' },
  { key: 'weekly',  label: 'Weekly' },
];

const PRAYER_SLOTS = [
  { name: 'Fajr',    time: '05:30', emoji: '🌅', hour: 5 },
  { name: 'Dhuhr',   time: '12:30', emoji: '☀️',  hour: 12 },
  { name: 'Asr',     time: '15:45', emoji: '🌤️', hour: 15 },
  { name: 'Maghrib', time: '18:20', emoji: '🌇', hour: 18 },
  { name: 'Isha',    time: '20:00', emoji: '🌙', hour: 20 },
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ── Quick Add Form ────────────────────────────────────────────────────────────
function QuickAddForm({ date, onAdd, onClose }) {
  const [title, setTitle]         = useState('');
  const [time, setTime]           = useState('');
  const [duration, setDuration]   = useState(30);
  const [category, setCategory]   = useState('personal');
  const [priority, setPriority]   = useState('medium');
  const [recurrence, setRecurrence] = useState('none');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), time, duration: parseInt(duration), category, priority, recurrence, date });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="bg-[#0a1f44] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to get done today?"
          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-base font-medium" />

        <div className="flex gap-2 flex-wrap">
          {/* Category */}
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-[#071224]">{c.emoji} {c.key}</option>)}
          </select>

          {/* Priority */}
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            {PRIORITIES.map(p => <option key={p.key} value={p.key} className="bg-[#071224]">{p.label}</option>)}
          </select>

          {/* Recurrence */}
          <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            {RECURRENCE_OPTIONS.map(r => <option key={r.key} value={r.key} className="bg-[#071224]">🔁 {r.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <Input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="bg-white/5 border-white/20 text-white flex-1" />
          <select value={duration} onChange={e => setDuration(e.target.value)}
            className="bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none flex-1">
            {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d} className="bg-[#071224]">{d} min</option>)}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/15 text-white/60 bg-transparent">Cancel</Button>
          <Button type="submit" className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Planner Item ──────────────────────────────────────────────────────────────
function PlannerItem({ item, index, onToggle, onDelete, onStartPomodoro, draggable = false }) {
  const cat = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[5];
  const pri = PRIORITIES.find(p => p.key === item.priority) || PRIORITIES[1];
  const done = item.status === 'completed' || item.is_done;

  const inner = (dragHandleProps) => (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-2xl border transition-all',
      done ? 'opacity-40 bg-white/[0.01] border-white/5' : 'bg-white/[0.03] border-white/8 hover:border-white/15'
    )}>
      {/* Drag handle */}
      {draggable && (
        <span {...dragHandleProps} className="flex-shrink-0 text-white/15 hover:text-white/40 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </span>
      )}

      {/* Complete toggle */}
      <button onClick={() => onToggle(item)} className="flex-shrink-0 transition-transform active:scale-90">
        {done
          ? <CheckCircle2 className="w-5 h-5 text-teal-400" />
          : <Circle className="w-5 h-5 text-white/25 hover:text-teal-400 transition-colors" />}
      </button>

      {/* Color bar */}
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: cat.color }} />

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold leading-tight', done ? 'line-through text-white/30' : 'text-white')}>
          {item.title}
          {item.recurrence && item.recurrence !== 'none' && (
            <span className="ml-1.5 text-[9px] text-teal-400/70 font-black uppercase tracking-wider">🔁 {item.recurrence}</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.time && <span className="text-[10px] text-white/40 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{item.time}</span>}
          {item.duration && <span className="text-[10px] text-white/30">{item.duration}m</span>}
          <span className="text-[10px]">{cat.emoji}</span>
        </div>
      </div>

      {/* Priority dot */}
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', pri.dot)} />

      {/* Pomodoro */}
      {!done && (
        <button onClick={() => onStartPomodoro(item)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all flex-shrink-0" title="Start Pomodoro">
          <Timer className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete */}
      <button onClick={() => onDelete(item)}
        className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (!draggable) return <div>{inner(null)}</div>;

  return (
    <Draggable draggableId={String(item.id)} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}
          className={cn('mb-1.5', snapshot.isDragging && 'opacity-80 scale-[1.02]')}>
          {inner(provided.dragHandleProps)}
        </div>
      )}
    </Draggable>
  );
}

// ── Timeline View with DnD ────────────────────────────────────────────────────
function TimelineView({ items, prayers, onToggle, onDelete, onStartPomodoro, onDropOnHour }) {
  const timed   = items.filter(i => i.time);
  const untimed = items.filter(i => !i.time);

  const slotItems = (hour) => ({
    events:  timed.filter(i => Math.floor(timeToMinutes(i.time) / 60) === hour),
    prayers: prayers.filter(p => p.hour === hour),
  });

  return (
    <DragDropContext onDragEnd={({ draggableId, destination }) => {
      if (!destination || !destination.droppableId.startsWith('hour-')) return;
      const hour = parseInt(destination.droppableId.replace('hour-', ''));
      onDropOnHour(draggableId, hour);
    }}>
      <div className="space-y-0">
        {HOURS.map(hour => {
          const { events, prayers: prayersInSlot } = slotItems(hour);
          const isCurrentHour = isToday(new Date()) && new Date().getHours() === hour;

          return (
            <div key={hour} className="flex gap-3 min-h-[56px]">
              {/* Hour label */}
              <div className="w-14 flex-shrink-0 pt-2 text-right">
                <span className={cn('text-xs font-bold', isCurrentHour ? 'text-teal-400' : 'text-white/20')}>
                  {hourLabel(hour)}
                </span>
              </div>

              {/* Drop zone */}
              <Droppable droppableId={`hour-${hour}`}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={cn('flex-1 border-t border-white/5 pt-2 pb-1 min-h-[52px] rounded-lg transition-colors',
                      snapshot.isDraggingOver && 'bg-teal-400/5 border-teal-400/20')}>
                    {isCurrentHour && <div className="h-0.5 bg-teal-400 rounded-full mb-1 -mt-px" />}

                    {prayersInSlot.map(p => (
                      <div key={p.name} className="flex items-center gap-2 mb-1 py-1 px-3 bg-amber-400/8 border border-amber-400/15 rounded-xl">
                        <span>{p.emoji}</span>
                        <span className="text-xs font-bold text-amber-300">{p.name}</span>
                        <span className="text-xs text-amber-400/60 ml-auto">{p.time}</span>
                      </div>
                    ))}

                    {events.map((item, idx) => (
                      <PlannerItem key={item.id} item={item} index={idx}
                        onToggle={onToggle} onDelete={onDelete} onStartPomodoro={onStartPomodoro} draggable />
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}

        {/* Untimed */}
        {untimed.length > 0 && (
          <Droppable droppableId="untimed">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="mt-4 space-y-1.5">
                <p className="text-xs text-white/25 font-bold uppercase tracking-widest px-1 flex items-center gap-2">
                  <AlignLeft className="w-3 h-3" /> Unscheduled ({untimed.length})
                </p>
                {untimed.map((item, idx) => (
                  <PlannerItem key={item.id} item={item} index={idx}
                    onToggle={onToggle} onDelete={onDelete} onStartPomodoro={onStartPomodoro} draggable />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    </DragDropContext>
  );
}

// ── List View with DnD ────────────────────────────────────────────────────────
function ListView({ groups, onToggle, onDelete, onStartPomodoro, onReorder }) {
  return (
    <DragDropContext onDragEnd={({ source, destination, draggableId }) => {
      if (!destination) return;
      onReorder(draggableId, source, destination);
    }}>
      <div className="space-y-5">
        {groups.map(({ key, label, color, dot, items }) => {
          if (!items.length) return null;
          return (
            <div key={key}>
              <div className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-widest px-1 mb-1.5', color)}>
                <div className={cn('w-2 h-2 rounded-full', dot)} />
                {label} Priority ({items.length})
              </div>
              <Droppable droppableId={key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={cn('space-y-0 rounded-2xl transition-colors p-1 -m-1',
                      snapshot.isDraggingOver && 'bg-white/[0.02]')}>
                    {items.map((item, idx) => (
                      <PlannerItem key={item.id} item={item} index={idx}
                        onToggle={onToggle} onDelete={onDelete} onStartPomodoro={onStartPomodoro} draggable />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DailyPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm]   = useState(false);
  const [view, setView]                 = useState('list'); // list | timeline
  const [showPrayers, setShowPrayers]   = useState(true);
  const [aiLoading, setAiLoading]       = useState(false);
  const [showPlanMyDay, setShowPlanMyDay] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState(null); // item or null
  const [localItems, setLocalItems]     = useState([]);
  const qc = useQueryClient();

  const dateStr  = format(selectedDate, 'yyyy-MM-dd');
  const dateLabel = isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, d MMM');

  // ── Fetch tasks & events ──────────────────────────────────────────────────
  const { data: tasks = [] } = useQuery({
    queryKey: ['dailyTasks', dateStr],
    queryFn: async () => {
      const all = await SDK.entities.Task.list('-created_date', 300);
      return all.filter(t => {
        // show tasks due today OR recurring tasks
        if (t.due_date?.startsWith(dateStr)) return true;
        if (t.planner_date === dateStr) return true;
        if (t.recurrence === 'daily') return true;
        if (t.recurrence === 'weekly') {
          const taskDay = new Date(t.due_date || t.created_date).getDay();
          return taskDay === selectedDate.getDay();
        }
        return false;
      });
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['dailyEvents', dateStr],
    queryFn: async () => {
      const all = await SDK.entities.Event.list('-start_date', 200);
      return all.filter(e => e.start_date?.startsWith(dateStr));
    },
  });

  const allItems = useMemo(() => {
    const mapped = [
      ...tasks.map(t => ({ ...t, _type: 'task', time: t.due_time || t.time || '', category: t.category || 'work', priority: t.priority || 'medium', is_done: t.status === 'completed' })),
      ...events.map(e => ({ ...e, _type: 'event', time: e.start_date?.slice(11, 16) || '', category: e.category || 'personal', priority: 'medium', is_done: false })),
      ...localItems,
    ];
    return mapped.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [tasks, events, localItems]);

  const done  = allItems.filter(i => i.status === 'completed' || i.is_done);
  const total = allItems.length;
  const progressPct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAddItem = async ({ title, time, duration, category, priority, recurrence, date }) => {
    const id = `local-${Date.now()}`;
    setLocalItems(prev => [...prev, { id, title, time, duration, category, priority, recurrence, _type: 'task', is_done: false }]);
    try {
      await SDK.entities.Task.create({
        title, due_date: date, due_time: time, category, priority,
        status: 'not_started', planner_date: date, recurrence,
      });
      qc.invalidateQueries(['dailyTasks', date]);
    } catch { /* ignore */ }
    toast.success('Added to today\'s plan!');
  };

  // ── Toggle ────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (item) => {
    const isDone = item.status === 'completed' || item.is_done;
    if (item._type === 'task' && !item.id?.startsWith('local-')) {
      await SDK.entities.Task.update(item.id, { status: isDone ? 'not_started' : 'completed' });
      qc.invalidateQueries(['dailyTasks', dateStr]);
    } else {
      setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: !i.is_done } : i));
    }
  }, [dateStr, qc]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (item) => {
    if (item.id?.startsWith('local-')) {
      setLocalItems(prev => prev.filter(i => i.id !== item.id));
    } else if (item._type === 'task') {
      await SDK.entities.Task.delete(item.id);
      qc.invalidateQueries(['dailyTasks', dateStr]);
    } else {
      await SDK.entities.Event.delete(item.id);
      qc.invalidateQueries(['dailyEvents', dateStr]);
    }
    toast.success('Removed');
  }, [dateStr, qc]);

  // ── DnD: list reorder ─────────────────────────────────────────────────────
  const handleReorder = useCallback(async (draggableId, src, dest) => {
    if (src.droppableId === dest.droppableId && src.index === dest.index) return;
    // For local items just reorder; for persisted tasks update priority if group changed
    const item = allItems.find(i => String(i.id) === draggableId);
    if (!item) return;
    const newPriority = dest.droppableId; // droppableId = priority key
    if (item.priority !== newPriority && !item.id?.startsWith('local-') && item._type === 'task') {
      await SDK.entities.Task.update(item.id, { priority: newPriority });
      qc.invalidateQueries(['dailyTasks', dateStr]);
      toast.success(`Priority → ${newPriority}`);
    }
  }, [allItems, dateStr, qc]);

  // ── DnD: timeline drop on hour ────────────────────────────────────────────
  const handleDropOnHour = useCallback(async (draggableId, hour) => {
    const item = allItems.find(i => String(i.id) === draggableId);
    if (!item) return;
    const newTime = minutesToTime(hour * 60);
    if (item.id?.startsWith('local-')) {
      setLocalItems(prev => prev.map(i => i.id === item.id ? { ...i, time: newTime } : i));
    } else if (item._type === 'task') {
      await SDK.entities.Task.update(item.id, { due_time: newTime });
      qc.invalidateQueries(['dailyTasks', dateStr]);
    }
    toast.success(`Rescheduled to ${newTime}`);
  }, [allItems, dateStr, qc]);

  // ── Apply AI Schedule ────────────────────────────────────────────────────
  const handleApplySchedule = useCallback(async (schedule) => {
    for (const item of schedule) {
      if (!item.task_id || item.task_id.startsWith('local-')) continue;
      const updates = {};
      if (item.suggested_time) updates.due_time = item.suggested_time;
      if (item.suggested_duration) updates.estimated_minutes = item.suggested_duration;
      if (Object.keys(updates).length > 0) {
        await SDK.entities.Task.update(item.task_id, updates);
      }
    }
    qc.invalidateQueries(['dailyTasks', dateStr]);
    toast.success('✨ AI schedule applied to your tasks!');
    setShowPlanMyDay(false);
  }, [dateStr, qc]);

  // ── AI Plan ───────────────────────────────────────────────────────────────
  const generateAIPlan = async () => {
    setAiLoading(true);
    try {
      const existing = allItems.map(i => i.title).join(', ');
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Create a balanced productive daily schedule for ${format(selectedDate, 'EEEE, MMMM d yyyy')}. Existing: ${existing || 'none'}. Suggest 4-6 tasks including wellness, work focus, and optional Islamic practices. Titles under 40 chars.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'object', properties: {
              title: { type: 'string' }, time: { type: 'string' },
              duration: { type: 'number' }, category: { type: 'string' },
              priority: { type: 'string' }, recurrence: { type: 'string' },
            }}}
          }
        }
      });
      let added = 0;
      for (const s of (result.suggestions || [])) {
        const id = `local-ai-${Date.now()}-${added}`;
        setLocalItems(prev => [...prev, {
          id, title: s.title, time: s.time || '', duration: s.duration || 30,
          category: CATEGORIES.find(c => c.key === s.category) ? s.category : 'personal',
          priority: ['high','medium','low'].includes(s.priority) ? s.priority : 'medium',
          recurrence: s.recurrence || 'none',
          _type: 'task', is_done: false,
        }]);
        added++;
      }
      toast.success(`✨ AI added ${added} suggestions!`);
    } catch { toast.error('AI planning failed'); }
    setAiLoading(false);
  };

  // Groups for list view
  const groups = PRIORITIES.map(p => ({
    ...p,
    items: allItems.filter(i => (i.priority || 'medium') === p.key),
  }));

  const period = (() => {
    const h = new Date().getHours();
    if (h < 6) return { label: 'Late Night', icon: Moon };
    if (h < 12) return { label: 'Morning', icon: Sunrise };
    if (h < 17) return { label: 'Afternoon', icon: Sun };
    if (h < 20) return { label: 'Evening', icon: Sunset };
    return { label: 'Night', icon: Moon };
  })();

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0] p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedDate(d => subDays(d, 1))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-all">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <period.icon className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold text-amber-300">{period.label}</span>
                  </div>
                  <h1 className="text-2xl font-black text-white">{dateLabel}</h1>
                  {!isToday(selectedDate) && <p className="text-white/50 text-xs">{format(selectedDate, 'MMMM d, yyyy')}</p>}
                </div>
                <button onClick={() => setSelectedDate(d => addDays(d, 1))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-all">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>

              {!isToday(selectedDate) && (
                <div className="flex justify-center mb-3">
                  <button onClick={() => setSelectedDate(new Date())}
                    className="text-xs font-bold text-white/60 hover:text-white border border-white/20 px-3 py-1 rounded-full">
                    Back to Today
                  </button>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs text-white/60 mb-1.5">
                  <span>{done.length}/{total} done</span>
                  <span className="font-bold text-white">{progressPct}%</span>
                </div>
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-white/80 to-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pomodoro timer */}
        <AnimatePresence>
          {pomodoroTask && (
            <PomodoroTimer taskTitle={pomodoroTask.title} onClose={() => setPomodoroTask(null)} />
          )}
        </AnimatePresence>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setShowAddForm(s => !s)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold gap-1.5 flex-shrink-0">
            <Plus className="w-4 h-4" /> Add
          </Button>
          <Button variant="outline" onClick={() => setShowPlanMyDay(s => !s)}
            className="border-[#29ABE2]/40 text-[#29ABE2] hover:bg-[#29ABE2]/10 bg-transparent gap-1.5 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            Plan My Day
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setShowPrayers(p => !p)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-bold transition-all',
                showPrayers ? 'bg-amber-400/15 border-amber-400/30 text-amber-300' : 'border-white/10 text-white/30 hover:text-white')}>
              🕌 Prayers
            </button>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              {[['list', '☰'], ['timeline', '⏱']].map(([v, icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn('px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                    view === v ? 'bg-teal-500 text-white' : 'text-white/30 hover:text-white')}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick add form */}
        <AnimatePresence>
          {showAddForm && <QuickAddForm date={dateStr} onAdd={handleAddItem} onClose={() => setShowAddForm(false)} />}
        </AnimatePresence>

        {/* Plan My Day Panel */}
        <AnimatePresence>
          {showPlanMyDay && (
            <PlanMyDayPanel
              tasks={allItems.filter(i => i._type === 'task')}
              date={dateStr}
              onApplySchedule={handleApplySchedule}
              onClose={() => setShowPlanMyDay(false)}
            />
          )}
        </AnimatePresence>

        {/* Prayer pills */}
        {showPrayers && (
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {PRAYER_SLOTS.map(p => (
              <div key={p.name} className="flex-shrink-0 flex items-center gap-1.5 bg-amber-400/8 border border-amber-400/15 rounded-2xl px-3 py-2">
                <span className="text-sm">{p.emoji}</span>
                <div>
                  <p className="text-[10px] font-black text-amber-300">{p.name}</p>
                  <p className="text-[9px] text-amber-400/50">{p.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {allItems.length === 0 && !showAddForm ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 bg-white/[0.02] border border-white/8 rounded-3xl">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-white font-black text-lg mb-2">Nothing planned yet</h3>
            <p className="text-white/40 text-sm mb-5">Add tasks manually or let AI build your day.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowAddForm(true)} className="bg-teal-500 text-white font-bold gap-1">
                <Plus className="w-4 h-4" /> Add Task
              </Button>
              <Button onClick={() => setShowPlanMyDay(true)} variant="outline"
                className="border-[#29ABE2]/30 text-[#29ABE2] bg-transparent gap-1">
                <Sparkles className="w-4 h-4" /> Plan My Day
              </Button>
            </div>
          </motion.div>
        ) : view === 'timeline' ? (
          <TimelineView
            items={allItems}
            prayers={showPrayers ? PRAYER_SLOTS : []}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onStartPomodoro={setPomodoroTask}
            onDropOnHour={handleDropOnHour}
          />
        ) : (
          <ListView
            groups={groups}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onStartPomodoro={setPomodoroTask}
            onReorder={handleReorder}
          />
        )}

        {/* Day summary */}
        {total > 0 && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['Total', total, 'text-white'],
              ['Done', done.length, 'text-teal-400'],
              ['Left', total - done.length, 'text-amber-400'],
              ['Focus', `${progressPct}%`, 'text-purple-400'],
            ].map(([label, val, cls]) => (
              <div key={label} className="bg-white/[0.03] border border-white/8 rounded-2xl py-3">
                <p className={cn('text-xl font-black', cls)}>{val}</p>
                <p className="text-[10px] text-white/30 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}