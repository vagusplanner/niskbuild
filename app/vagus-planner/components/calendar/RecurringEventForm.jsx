import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Info, Repeat } from 'lucide-react';

const WEEK_DAYS = [
  { id: 0, label: 'Sun', full: 'Sunday' },
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
];

const WEEK_POSITIONS = [
  { value: 1,  label: 'First' },
  { value: 2,  label: 'Second' },
  { value: 3,  label: 'Third' },
  { value: 4,  label: 'Fourth' },
  { value: -1, label: 'Last' },
];

const HOLIDAY_RULES = [
  { value: 'skip',              label: 'Skip occurrence' },
  { value: 'next_workday',      label: 'Move to next workday' },
  { value: 'previous_workday',  label: 'Move to previous workday' },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all ${
        active
          ? 'bg-teal-600 text-white border-teal-600'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
      }`}
    >
      {children}
    </button>
  );
}

function getPreview({ recurrenceType, recurrenceInterval, recurrenceDays, recurrenceMonthlyType, recurrenceMonthlyDay, recurrenceMonthlyWeek, recurrenceMonthlyWeekday }) {
  const n = recurrenceInterval || 1;
  if (recurrenceType === 'daily') return n === 1 ? 'Every day' : `Every ${n} days`;

  if (recurrenceType === 'weekly') {
    const days = (recurrenceDays || []).sort().map(d => WEEK_DAYS[d]?.label).join(', ');
    const daysStr = days || 'selected days';
    return n === 1 ? `Every week on ${daysStr}` : `Every ${n} weeks on ${daysStr}`;
  }

  if (recurrenceType === 'monthly') {
    if (recurrenceMonthlyType === 'day_of_month') {
      const day = recurrenceMonthlyDay || 1;
      return n === 1 ? `Monthly on day ${day}` : `Every ${n} months on day ${day}`;
    }
    if (recurrenceMonthlyType === 'last_weekday') {
      const weekday = WEEK_DAYS[recurrenceMonthlyWeekday ?? 1]?.full || 'Monday';
      return n === 1 ? `Monthly on the last ${weekday}` : `Every ${n} months on the last ${weekday}`;
    }
    if (recurrenceMonthlyType === 'first_weekday') {
      const weekday = WEEK_DAYS[recurrenceMonthlyWeekday ?? 1]?.full || 'Monday';
      return n === 1 ? `Monthly on the first ${weekday}` : `Every ${n} months on the first ${weekday}`;
    }
    // day_of_week (Nth weekday)
    const pos = WEEK_POSITIONS.find(w => w.value === recurrenceMonthlyWeek)?.label || 'First';
    const weekday = WEEK_DAYS[recurrenceMonthlyWeekday ?? 1]?.full || 'Monday';
    return n === 1 ? `Monthly on the ${pos} ${weekday}` : `Every ${n} months on the ${pos} ${weekday}`;
  }

  if (recurrenceType === 'yearly') return n === 1 ? 'Every year' : `Every ${n} years`;
  return 'Custom recurrence';
}

export default function RecurringEventForm({
  recurrenceType,
  recurrenceEndDate,
  recurrenceDays,
  recurrenceEndType = 'never',
  recurrenceOccurrences,
  recurrenceInterval = 1,
  recurrenceMonthlyType = 'day_of_month',
  recurrenceMonthlyDay,
  recurrenceMonthlyWeek,
  recurrenceMonthlyWeekday,
  adjustForHolidays = false,
  holidayAdjustmentRule = 'next_workday',
  exceptionDates = [],
  customOccurrenceDates = [],
  onRecurrenceChange,
}) {
  const handleDayToggle = (dayId) => {
    const current = recurrenceDays || [];
    const next = current.includes(dayId) ? current.filter(d => d !== dayId) : [...current, dayId];
    onRecurrenceChange('recurrence_days', next);
  };

  const preview = getPreview({ recurrenceType, recurrenceInterval, recurrenceDays, recurrenceMonthlyType, recurrenceMonthlyDay, recurrenceMonthlyWeek, recurrenceMonthlyWeekday });

  return (
    <div className="space-y-5 p-4 bg-gradient-to-br from-teal-50/80 to-emerald-50/60 dark:from-teal-950/20 dark:to-emerald-950/20 rounded-xl border border-teal-200 dark:border-teal-800">

      {/* Preview */}
      <div className="flex items-center gap-2 p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-teal-200 dark:border-teal-700">
        <Repeat className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">{preview}</span>
      </div>

      {/* Pattern + Interval */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Repeat Pattern</Label>
          <Select value={recurrenceType} onValueChange={v => onRecurrenceChange('recurrence_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Every</Label>
          <Input
            type="number" min="1" max="99"
            value={recurrenceInterval || 1}
            onChange={e => onRecurrenceChange('recurrence_interval', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* Weekly: day picker */}
      {recurrenceType === 'weekly' && (
        <div className="space-y-2">
          <Label>On these days</Label>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map(day => (
              <button
                key={day.id}
                type="button"
                onClick={() => handleDayToggle(day.id)}
                className={`py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                  (recurrenceDays || []).includes(day.id)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {(recurrenceDays || []).length === 0 && (
            <p className="text-xs text-amber-600">Select at least one day</p>
          )}
        </div>
      )}

      {/* Monthly options */}
      {recurrenceType === 'monthly' && (
        <div className="space-y-3">
          <Label>Monthly Pattern</Label>
          <div className="grid grid-cols-2 gap-2">
            <TabBtn active={recurrenceMonthlyType === 'day_of_month'} onClick={() => onRecurrenceChange('recurrence_monthly_type', 'day_of_month')}>
              Day of Month
            </TabBtn>
            <TabBtn active={recurrenceMonthlyType === 'day_of_week'} onClick={() => onRecurrenceChange('recurrence_monthly_type', 'day_of_week')}>
              Nth Weekday
            </TabBtn>
            <TabBtn active={recurrenceMonthlyType === 'first_weekday'} onClick={() => onRecurrenceChange('recurrence_monthly_type', 'first_weekday')}>
              First Weekday
            </TabBtn>
            <TabBtn active={recurrenceMonthlyType === 'last_weekday'} onClick={() => onRecurrenceChange('recurrence_monthly_type', 'last_weekday')}>
              Last Weekday
            </TabBtn>
          </div>

          {recurrenceMonthlyType === 'day_of_month' && (
            <div className="space-y-1.5">
              <Label>Day of Month (1–31)</Label>
              <Input
                type="number" min="1" max="31"
                value={recurrenceMonthlyDay || 1}
                onChange={e => onRecurrenceChange('recurrence_monthly_day', parseInt(e.target.value))}
              />
            </div>
          )}

          {recurrenceMonthlyType === 'day_of_week' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Week</Label>
                <Select value={String(recurrenceMonthlyWeek || 1)} onValueChange={v => onRecurrenceChange('recurrence_monthly_week', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEK_POSITIONS.map(p => (
                      <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Weekday</Label>
                <Select value={String(recurrenceMonthlyWeekday ?? 1)} onValueChange={v => onRecurrenceChange('recurrence_monthly_weekday', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEK_DAYS.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.full}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(recurrenceMonthlyType === 'first_weekday' || recurrenceMonthlyType === 'last_weekday') && (
            <div className="space-y-1.5">
              <Label>Weekday</Label>
              <Select value={String(recurrenceMonthlyWeekday ?? 1)} onValueChange={v => onRecurrenceChange('recurrence_monthly_weekday', parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.full}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* End condition */}
      <div className="space-y-3">
        <Label>Ends</Label>
        <div className="grid grid-cols-3 gap-2">
          <TabBtn active={recurrenceEndType === 'never'} onClick={() => onRecurrenceChange('recurrence_end_type', 'never')}>Never</TabBtn>
          <TabBtn active={recurrenceEndType === 'date'} onClick={() => onRecurrenceChange('recurrence_end_type', 'date')}>On Date</TabBtn>
          <TabBtn active={recurrenceEndType === 'occurrences'} onClick={() => onRecurrenceChange('recurrence_end_type', 'occurrences')}>After N Times</TabBtn>
        </div>

        {recurrenceEndType === 'date' && (
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={recurrenceEndDate || ''} onChange={e => onRecurrenceChange('recurrence_end_date', e.target.value)} className="h-10" />
          </div>
        )}

        {recurrenceEndType === 'occurrences' && (
          <div className="space-y-1.5">
            <Label>Number of Occurrences</Label>
            <Input
              type="number" min="1" max="365"
              value={recurrenceOccurrences || 10}
              onChange={e => onRecurrenceChange('recurrence_occurrences', parseInt(e.target.value))}
              className="h-10"
            />
            <p className="text-xs text-teal-700 dark:text-teal-300">
              Will repeat {recurrenceOccurrences || 10} time{(recurrenceOccurrences || 10) !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Holiday adjustment */}
      <div className="space-y-3 pt-3 border-t border-teal-200 dark:border-teal-800">
        <div className="flex items-center justify-between">
          <div>
            <Label>Adjust for Public Holidays</Label>
            <p className="text-xs text-slate-500 mt-0.5">Skip or move events that fall on holidays</p>
          </div>
          <Switch checked={adjustForHolidays} onCheckedChange={v => onRecurrenceChange('adjust_for_holidays', v)} />
        </div>

        {adjustForHolidays && (
          <div className="space-y-1.5">
            <Label>When a holiday is hit</Label>
            <Select value={holidayAdjustmentRule} onValueChange={v => onRecurrenceChange('holiday_adjustment_rule', v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOLIDAY_RULES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Exceptions / custom summary */}
      {(exceptionDates?.length > 0 || customOccurrenceDates?.length > 0) && (
        <div className="pt-3 border-t border-teal-200 dark:border-teal-800 space-y-1 text-xs">
          {exceptionDates?.length > 0 && (
            <p><span className="text-slate-500">Skipped: </span><span className="font-semibold text-rose-600">{exceptionDates.length} date{exceptionDates.length !== 1 ? 's' : ''}</span></p>
          )}
          {customOccurrenceDates?.length > 0 && (
            <p><span className="text-slate-500">Extra dates: </span><span className="font-semibold text-teal-700">{customOccurrenceDates.length} occurrence{customOccurrenceDates.length !== 1 ? 's' : ''}</span></p>
          )}
        </div>
      )}
    </div>
  );
}