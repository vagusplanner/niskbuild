import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calendar, RotateCw } from 'lucide-react';

const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Interval' }
];

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export default function EnhancedRecurringEventForm({ onRecurrenceChange, eventDate }) {
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [customInterval, setCustomInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState([eventDate?.getDay() || 1]);
  const [endType, setEndType] = useState('never'); // never, occurrences, date
  const [occurrences, setOccurrences] = useState(10);
  const [endDate, setEndDate] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleToggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!isRecurring) {
      onRecurrenceChange(null);
      return;
    }

    const recurrenceConfig = {
      type: recurrenceType,
      customInterval: recurrenceType === 'custom' ? customInterval : 1,
      days: ['weekly', 'biweekly', 'custom'].includes(recurrenceType) ? selectedDays : undefined,
      endType,
      occurrences: endType === 'occurrences' ? occurrences : undefined,
      endDate: endType === 'date' ? endDate : undefined
    };

    onRecurrenceChange(recurrenceConfig);
  };

  const getRecurrenceSummary = () => {
    if (!isRecurring) return 'Non-recurring';

    let summary = `Every ${recurrenceType === 'custom' ? `${customInterval} days` : recurrenceType}`;
    
    if (['weekly', 'biweekly', 'custom'].includes(recurrenceType) && selectedDays.length > 0) {
      const dayNames = selectedDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ');
      summary += ` on ${dayNames}`;
    }

    if (endType === 'occurrences') {
      summary += ` for ${occurrences} occurrences`;
    } else if (endType === 'date' && endDate) {
      summary += ` until ${new Date(endDate).toLocaleDateString()}`;
    }

    return summary;
  };

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCw className="w-5 h-5 text-blue-600" />
            Recurrence
          </CardTitle>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-5 h-5 text-slate-500" />
          </motion.div>
        </div>
        <p className="text-xs text-slate-600 mt-2">{getRecurrenceSummary()}</p>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="space-y-6 pt-6 border-t border-slate-200">
              {/* Enable Recurring */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurringToggle"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                />
                <label htmlFor="recurringToggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Make this event recurring
                </label>
              </div>

              {isRecurring && (
                <>
                  {/* Recurrence Type */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">Repeat Pattern</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {RECURRENCE_TYPES.map((type) => (
                        <motion.button
                          key={type.value}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setRecurrenceType(type.value)}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-all
                            ${recurrenceType === type.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }
                          `}
                        >
                          {type.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Interval */}
                  {recurrenceType === 'custom' && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">
                        Every N Days
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customInterval}
                          onChange={(e) => setCustomInterval(parseInt(e.target.value))}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-600">days</span>
                      </div>
                    </div>
                  )}

                  {/* Day Selection for Weekly/Biweekly */}
                  {['weekly', 'biweekly', 'custom'].includes(recurrenceType) && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-3">Repeat On</p>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS.map((day) => (
                          <motion.button
                            key={day.value}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => handleToggleDay(day.value)}
                            className={`
                              w-10 h-10 rounded-lg font-bold transition-all
                              ${selectedDays.includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }
                            `}
                          >
                            {day.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End Condition */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-3">End Recurrence</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endType"
                          value="never"
                          checked={endType === 'never'}
                          onChange={(e) => setEndType(e.target.value)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">Never</span>
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endType"
                          value="occurrences"
                          checked={endType === 'occurrences'}
                          onChange={(e) => setEndType(e.target.value)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">After</span>
                        {endType === 'occurrences' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={occurrences}
                              onChange={(e) => setOccurrences(parseInt(e.target.value))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600">occurrences</span>
                          </div>
                        )}
                      </label>

                      <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="endType"
                          value="date"
                          checked={endType === 'date'}
                          onChange={(e) => setEndType(e.target.value)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-slate-700">On Date</span>
                        {endType === 'date' && (
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Apply Recurrence
                </Button>
                <Button
                  onClick={() => setExpanded(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}