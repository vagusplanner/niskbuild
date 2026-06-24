import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, CalendarX, CalendarPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function RecurringExceptionManager({
  exceptionDates = [],
  customDates = [],
  onExceptionDatesChange,
  onCustomDatesChange,
}) {
  const [newException, setNewException] = useState('');
  const [newCustom, setNewCustom] = useState('');
  const [showExceptions, setShowExceptions] = useState(exceptionDates.length > 0);
  const [showCustom, setShowCustom] = useState(customDates.length > 0);

  const addException = () => {
    if (newException && !exceptionDates.includes(newException)) {
      onExceptionDatesChange([...exceptionDates, newException].sort());
      setNewException('');
    }
  };

  const addCustom = () => {
    if (newCustom && !customDates.includes(newCustom)) {
      onCustomDatesChange([...customDates, newCustom].sort());
      setNewCustom('');
    }
  };

  const handleKey = (fn) => (e) => { if (e.key === 'Enter') { e.preventDefault(); fn(); } };

  return (
    <div className="space-y-3">
      {/* Exception Dates */}
      <div className="rounded-xl border border-rose-200 dark:border-rose-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExceptions(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Skip Dates
              {exceptionDates.length > 0 && (
                <span className="ml-2 text-xs font-normal text-rose-500">({exceptionDates.length} set)</span>
              )}
            </span>
          </div>
          {showExceptions ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-rose-400" />}
        </button>

        {showExceptions && (
          <div className="px-4 pb-4 pt-3 space-y-3 bg-white dark:bg-slate-900/50">
            <p className="text-xs text-slate-500">These dates will be skipped, even if they match the recurrence pattern.</p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newException}
                onChange={e => setNewException(e.target.value)}
                onKeyDown={handleKey(addException)}
                className="flex-1 h-9"
              />
              <Button
                type="button"
                onClick={addException}
                disabled={!newException}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {exceptionDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {exceptionDates.map((date, idx) => (
                  <Badge key={idx} className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-700 flex items-center gap-1 py-1 px-2">
                    <CalendarX className="w-3 h-3" />
                    {format(parseISO(date), 'MMM d, yyyy')}
                    <button type="button" onClick={() => onExceptionDatesChange(exceptionDates.filter(d => d !== date))} className="ml-1 hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Extra Dates */}
      <div className="rounded-xl border border-teal-200 dark:border-teal-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCustom(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-950/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-900 dark:text-teal-200">
              Extra Occurrences
              {customDates.length > 0 && (
                <span className="ml-2 text-xs font-normal text-teal-500">({customDates.length} set)</span>
              )}
            </span>
          </div>
          {showCustom ? <ChevronUp className="w-4 h-4 text-teal-400" /> : <ChevronDown className="w-4 h-4 text-teal-400" />}
        </button>

        {showCustom && (
          <div className="px-4 pb-4 pt-3 space-y-3 bg-white dark:bg-slate-900/50">
            <p className="text-xs text-slate-500">Add specific dates that don't fit the regular pattern but should still have an occurrence.</p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newCustom}
                onChange={e => setNewCustom(e.target.value)}
                onKeyDown={handleKey(addCustom)}
                className="flex-1 h-9"
              />
              <Button
                type="button"
                onClick={addCustom}
                disabled={!newCustom}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {customDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customDates.map((date, idx) => (
                  <Badge key={idx} className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-700 flex items-center gap-1 py-1 px-2">
                    <CalendarPlus className="w-3 h-3" />
                    {format(parseISO(date), 'MMM d, yyyy')}
                    <button type="button" onClick={() => onCustomDatesChange(customDates.filter(d => d !== date))} className="ml-1 hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}