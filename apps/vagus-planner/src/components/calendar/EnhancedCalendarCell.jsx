import React from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toHijri } from '@/components/utils/hijriUtils';
import CalendarTasksOverlay from '@/components/calendar/CalendarTasksOverlay';
import HabitCalendarOverlay from '@/components/habits/HabitCalendarOverlay';
import WellnessCalendarOverlay from '@/components/wellness/WellnessCalendarOverlay';
import DayCellWeather from '@/components/calendar/DayCellWeather';

export default function EnhancedCalendarCell({ 
  day, 
  currentDate, 
  selectedDate, 
  events = [], 
  onDateSelect, 
  onQuickAdd,
  showFastingDays = true,
  userSettings = null
}) {
  const [hijriDate, setHijriDate] = React.useState(null);
  const isToday = isSameDay(day, new Date());
  const isSelected = isSameDay(day, selectedDate);
  const isCurrentMonth = isSameMonth(day, currentDate);
  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.start_date), day)
  );

  // Get Hijri date
  React.useEffect(() => {
    toHijri(day).then(setHijriDate);
  }, [day]);
  
  const hijriDay = hijriDate?.day || '';

  // Check for fasting days
  const isMondayThursday = [1, 4].includes(day.getDay());
  const isWhiteDay = hijriDay >= 13 && hijriDay <= 15;
  const isRamadan = hijriDate?.monthName === 'Ramadan';

  return (
    <div
      onClick={() => onDateSelect(day)}
      className={`
        min-h-[100px] lg:min-h-[120px] p-2 border cursor-pointer transition-all group
        ${isToday ? 'bg-teal-50 border-teal-300 dark:bg-teal-950 dark:border-teal-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}
        ${isSelected ? 'ring-2 ring-teal-500' : ''}
        ${!isCurrentMonth ? 'opacity-40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
      `}
    >
      {/* Date Headers */}
      <div className="flex items-start justify-between mb-1">
        <div className="space-y-0.5">
          <div className={`text-sm font-semibold ${
            isToday ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {format(day, 'd')}
          </div>
          {hijriDay && isCurrentMonth && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {hijriDay}
            </div>
          )}
        </div>

        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(day);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          <Plus className="w-3 h-3 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Fasting Indicators */}
      {showFastingDays && isCurrentMonth && (
        <div className="flex gap-1 mb-1">
          {isMondayThursday && (
            <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded" title="Recommended fasting day">
              🌙
            </span>
          )}
          {isWhiteDay && (
            <span className="text-[10px] px-1 py-0.5 bg-teal-100 text-teal-700 rounded" title="White Days (13-15)">
              🤍
            </span>
          )}
          {isRamadan && (
            <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-800 rounded" title="Ramadan">
              ⭐
            </span>
          )}
        </div>
      )}

      {/* Events */}
      <div className="space-y-1">
        {dayEvents.slice(0, 3).map((event, idx) => {
          const categoryColors = {
            work:     { bg: '#ccfbf1', border: '#0d9488' },  // teal-100 / teal-600
            personal: { bg: '#d1fae5', border: '#059669' },  // emerald-100 / emerald-600
            health:   { bg: '#d1fae5', border: '#047857' },  // emerald-100 / emerald-700
            prayer:   { bg: '#fef9c3', border: '#c9a227' },  // amber/gold — spiritual
            holiday:  { bg: '#fef3c7', border: '#b45309' },  // amber-100 / amber-700
            family:   { bg: '#f0fdfa', border: '#0f766e' },  // teal-50 / teal-700
            social:   { bg: '#e0f2fe', border: '#0369a1' },  // sky-100 / sky-700
            other:    { bg: '#f1f5f9', border: '#64748b' }   // slate
          };

          const colors = categoryColors[event.category] || categoryColors.other;

          return (
            <div
              key={event.id}
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-2 py-1 rounded truncate hover:shadow-sm transition-shadow cursor-pointer"
              style={{ 
                backgroundColor: colors.bg,
                borderLeft: `3px solid ${colors.border}`
              }}
              title={event.title}
            >
              {event.start_time && (
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {event.start_time} 
                </span>
              )}
              <span className="ml-1 text-slate-700 dark:text-slate-300">
                {event.title}
              </span>
            </div>
          );
        })}
        {dayEvents.length > 3 && (
          <div className="text-[10px] text-slate-500 pl-2">
            +{dayEvents.length - 3} more
          </div>
        )}
      </div>

      {/* Weather for this day (today only to avoid API spam) */}
      {isCurrentMonth && isToday && (
        <DayCellWeather day={day} userSettings={userSettings} />
      )}

      {/* Tasks for this day */}
      {isCurrentMonth && (
        <CalendarTasksOverlay date={day} />
      )}

      {/* Habits for this day */}
      {isCurrentMonth && (
        <HabitCalendarOverlay date={day} />
      )}

      {/* Wellness for this day */}
      {isCurrentMonth && (
        <WellnessCalendarOverlay date={day} />
      )}
    </div>
  );
}