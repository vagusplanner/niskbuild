import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutList,
  AlertCircle, CheckCircle2, Clock, Flag, BarChart2
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, isToday, isPast, startOfWeek,
  endOfWeek, addWeeks, subWeeks, eachWeekOfInterval, differenceInDays,
  parseISO, isWithinInterval, addDays, startOfYear, endOfYear
} from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITY_META = {
  urgent: { color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-950',    border: 'border-red-300 dark:border-red-700',    label: 'Urgent' },
  high:   { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-300 dark:border-orange-700', label: 'High' },
  medium: { color: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50 dark:bg-amber-950',  border: 'border-amber-300 dark:border-amber-700',  label: 'Medium' },
  low:    { color: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50 dark:bg-blue-950',   border: 'border-blue-300 dark:border-blue-700',   label: 'Low' },
};

const STATUS_META = {
  todo:        { label: 'To Do',       icon: Clock,         color: 'text-slate-500' },
  in_progress: { label: 'In Progress', icon: BarChart2,     color: 'text-blue-600' },
  completed:   { label: 'Completed',   icon: CheckCircle2,  color: 'text-emerald-600' },
  blocked:     { label: 'Blocked',     icon: AlertCircle,   color: 'text-red-600' },
};

const CATEGORY_COLORS = {
  work:     'from-blue-500 to-blue-600',
  personal: 'from-teal-500 to-teal-600',
  health:   'from-emerald-500 to-emerald-600',
  shopping: 'from-pink-500 to-pink-600',
  learning: 'from-violet-500 to-violet-600',
  home:     'from-amber-500 to-amber-600',
  other:    'from-slate-400 to-slate-500',
};

// ── Task Pill ─────────────────────────────────────────────────────────────────
function TaskPill({ task, compact = false, onClick }) {
  const p = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const isCompleted = task.status === 'completed';
  return (
    <button
      onClick={() => onClick?.(task)}
      className={cn(
        'w-full text-left rounded px-1.5 py-0.5 text-xs transition-all hover:brightness-95 active:scale-95',
        compact ? 'truncate' : 'flex items-center gap-1',
        p.bg, isCompleted && 'opacity-50 line-through'
      )}
    >
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', p.color)} />
      <span className="truncate">{task.title}</span>
    </button>
  );
}

// ── Month Calendar View ───────────────────────────────────────────────────────
function MonthView({ date, tasks, goals, onTaskClick }) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getItemsForDay = (day) => {
    const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));
    const dayGoals = goals.filter(g => g.target_date && isSameDay(parseISO(g.target_date), day));
    return { tasks: dayTasks, goals: dayGoals };
  };

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const { tasks: dayTasks, goals: dayGoals } = getItemsForDay(day);
          const inMonth = isSameMonth(day, date);
          const today = isToday(day);
          const hasOverdue = dayTasks.some(t => isPast(day) && t.status !== 'completed');
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[90px] rounded-lg p-1.5 border transition-colors',
                today
                  ? 'bg-teal-50 dark:bg-teal-950 border-teal-400 dark:border-teal-600'
                  : inMonth
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'bg-slate-50 dark:bg-slate-950 border-transparent opacity-50'
              )}
            >
              <div className={cn('text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                today ? 'bg-teal-600 text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map(t => <TaskPill key={t.id} task={t} compact onClick={onTaskClick} />)}
                {dayGoals.slice(0, 1).map(g => (
                  <div key={g.id} className="w-full text-left rounded px-1.5 py-0.5 text-xs bg-violet-50 dark:bg-violet-950 truncate flex items-center gap-1">
                    <Flag className="w-2.5 h-2.5 text-violet-600 flex-shrink-0" />
                    <span className="truncate text-violet-700 dark:text-violet-300">{g.title}</span>
                  </div>
                ))}
                {(dayTasks.length + dayGoals.length) > 3 && (
                  <div className="text-[10px] text-slate-400 pl-1">+{dayTasks.length + dayGoals.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ date, tasks, goals, onTaskClick }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const dayTasks = tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));
        const dayGoals = goals.filter(g => g.target_date && isSameDay(parseISO(g.target_date), day));
        const today = isToday(day);
        return (
          <div key={day.toISOString()} className={cn(
            'rounded-xl p-2 border min-h-[180px]',
            today ? 'bg-teal-50 dark:bg-teal-950 border-teal-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          )}>
            <div className="mb-2 text-center">
              <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
              <div className={cn('text-lg font-black mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                today ? 'bg-teal-600 text-white' : 'text-slate-800 dark:text-slate-100'
              )}>{format(day, 'd')}</div>
            </div>
            <div className="space-y-1">
              {dayTasks.map(t => <TaskPill key={t.id} task={t} onClick={onTaskClick} />)}
              {dayGoals.map(g => (
                <div key={g.id} className="rounded px-1.5 py-0.5 text-xs bg-violet-50 dark:bg-violet-950 flex items-center gap-1">
                  <Flag className="w-2.5 h-2.5 text-violet-600 flex-shrink-0" />
                  <span className="truncate text-violet-700 dark:text-violet-300 text-[11px]">{g.title}</span>
                </div>
              ))}
              {dayTasks.length === 0 && dayGoals.length === 0 && (
                <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center pt-2">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Timeline / Gantt-style List View ─────────────────────────────────────────
function TimelineView({ tasks, goals, onTaskClick }) {
  // Group by week buckets (next 8 weeks)
  const now = new Date();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return { start, end, label: i === 0 ? 'This Week' : i === 1 ? 'Next Week' : format(start, 'MMM d') + ' – ' + format(end, 'MMM d') };
  });

  const overdueItems = [
    ...tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed'),
    ...goals.filter(g => g.target_date && isPast(parseISO(g.target_date)) && g.status !== 'completed'),
  ];

  return (
    <div className="space-y-4">
      {/* Overdue bucket */}
      {overdueItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-600">Overdue</span>
            <Badge variant="destructive" className="text-[10px]">{overdueItems.length}</Badge>
          </div>
          <div className="space-y-1.5 pl-6 border-l-2 border-red-300 dark:border-red-800">
            {overdueItems.map(item => (
              <TimelineItem key={item.id} item={item} isGoal={!!item.target_date} onClick={onTaskClick} />
            ))}
          </div>
        </div>
      )}

      {/* Weekly buckets */}
      {weeks.map(({ start, end, label }) => {
        const weekTasks = tasks.filter(t => t.due_date && isWithinInterval(parseISO(t.due_date), { start, end }));
        const weekGoals = goals.filter(g => g.target_date && isWithinInterval(parseISO(g.target_date), { start, end }));
        const total = weekTasks.length + weekGoals.length;
        if (total === 0) return null;
        return (
          <div key={start.toISOString()}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
              <Badge variant="outline" className="text-[10px]">{total}</Badge>
            </div>
            <div className="space-y-1.5 pl-6 border-l-2 border-teal-200 dark:border-teal-800">
              {weekTasks.map(t => <TimelineItem key={t.id} item={t} isGoal={false} onClick={onTaskClick} />)}
              {weekGoals.map(g => <TimelineItem key={g.id} item={g} isGoal={true} onClick={onTaskClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineItem({ item, isGoal, onClick }) {
  const p = PRIORITY_META[item.priority] || PRIORITY_META.medium;
  const s = STATUS_META[item.status] || STATUS_META.todo;
  const StatusIcon = s.icon;
  const dateKey = isGoal ? item.target_date : item.due_date;
  const isCompleted = item.status === 'completed';

  return (
    <button
      onClick={() => onClick?.(item)}
      className={cn(
        'w-full text-left flex items-start gap-3 p-2.5 rounded-lg border transition-all hover:shadow-sm',
        isGoal
          ? 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800'
          : cn(p.bg, p.border),
        isCompleted && 'opacity-50'
      )}
    >
      <div className="mt-0.5">
        {isGoal
          ? <Flag className="w-4 h-4 text-violet-600 flex-shrink-0" />
          : <span className={cn('inline-block w-3 h-3 rounded-full flex-shrink-0', p.color)} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isCompleted && 'line-through text-slate-400')}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn('text-xs flex items-center gap-1', s.color)}>
            <StatusIcon className="w-3 h-3" />
            {s.label}
          </span>
          {dateKey && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(dateKey), 'EEE, MMM d')}
            </span>
          )}
          {item.category && (
            <span className="text-xs text-slate-400 capitalize">{item.category}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TaskTimelineCalendar({ onTaskClick }) {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterCategory, setFilterCategory] = useState('all');

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list('-due_date', 200),
    staleTime: 30000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.list('-target_date', 100),
    staleTime: 60000,
  });

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filterStatus === 'active' && t.status === 'completed') return false;
    if (filterStatus === 'completed' && t.status !== 'completed') return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  }), [tasks, filterStatus, filterCategory]);

  const filteredGoals = useMemo(() => goals.filter(g => {
    if (filterStatus === 'active' && g.status === 'completed') return false;
    if (filterStatus === 'completed' && g.status !== 'completed') return false;
    return true;
  }), [goals, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredTasks.length,
    overdue: filteredTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed').length,
    dueThisWeek: filteredTasks.filter(t => t.due_date && isWithinInterval(parseISO(t.due_date), { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) })).length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
  }), [filteredTasks]);

  const navigate = (dir) => {
    if (view === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const dateLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : 'Upcoming 8 Weeks';

  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category).filter(Boolean)))];

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-white dark:bg-slate-900', icon: LayoutList, iconColor: 'text-teal-600' },
          { label: 'Overdue',     value: stats.overdue, color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-950', icon: AlertCircle, iconColor: 'text-red-600' },
          { label: 'Due This Week', value: stats.dueThisWeek, color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950', icon: Clock, iconColor: 'text-amber-600' },
          { label: 'Completed',   value: stats.completed, color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950', icon: CheckCircle2, iconColor: 'text-emerald-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center gap-3', s.bg)}>
              <Icon className={cn('w-5 h-5 flex-shrink-0', s.iconColor)} />
              <div>
                <p className={cn('text-2xl font-black leading-tight', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View Tabs */}
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="h-8">
            <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
            <TabsTrigger value="week"  className="text-xs px-3 h-7">Week</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs px-3 h-7">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Date navigation */}
        {view !== 'timeline' && (
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-2 min-w-[160px] text-center">{dateLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs ml-1" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1 sm:mt-0">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {['active','completed','all'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn('px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  filterStatus === s ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}>
                {s}
              </button>
            ))}
          </div>
          {categories.length > 1 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 h-8"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {Object.entries(PRIORITY_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={cn('w-2.5 h-2.5 rounded-full', v.color)} />
            {v.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Flag className="w-3 h-3 text-violet-600" /> Goal milestone
        </span>
      </div>

      {/* Calendar/Timeline View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view + format(currentDate, 'yyyy-MM')}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {view === 'month' && (
            <MonthView date={currentDate} tasks={filteredTasks} goals={filteredGoals} onTaskClick={onTaskClick} />
          )}
          {view === 'week' && (
            <WeekView date={currentDate} tasks={filteredTasks} goals={filteredGoals} onTaskClick={onTaskClick} />
          )}
          {view === 'timeline' && (
            <TimelineView tasks={filteredTasks} goals={filteredGoals} onTaskClick={onTaskClick} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}