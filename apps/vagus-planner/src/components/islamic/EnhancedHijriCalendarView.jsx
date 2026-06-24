import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

const ISLAMIC_EVENTS = {
  1: { name: 'Islamic New Year', color: 'blue' },
  9: { name: 'Day of Ashura', color: 'orange' },
  9: { name: 'Ramadan', color: 'purple' }, // Month 9
  10: { name: 'Eid al-Fitr', color: 'green' }, // Month 10, day 1
  12: { name: 'Hajj Days', color: 'amber' }, // Month 12
};

export default function EnhancedHijriCalendarView() {
  const [hijriDate, setHijriDate] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHijriDate = async () => {
      try {
        const response = await fetch('https://api.aladhan.com/v1/today');
        const data = await response.json();
        setHijriDate(data.data.hijri);
        setDisplayMonth(data.data.hijri.month.number);
      } catch (error) {
        console.error('Error fetching Hijri date:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHijriDate();
  }, []);

  if (loading || !hijriDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Hijri Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Loading Hijri calendar...</div>
        </CardContent>
      </Card>
    );
  }

  const currentMonthIndex = displayMonth - 1;
  const monthName = HIJRI_MONTHS[currentMonthIndex];
  const daysInMonth = 29; // Simplified

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            {monthName} {hijriDate.year} AH
          </CardTitle>
          <Badge variant="outline">{hijriDate.day}/{displayMonth}/{hijriDate.year}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDisplayMonth(m => m === 1 ? 12 : m - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="text-sm font-semibold text-slate-700">{monthName}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDisplayMonth(m => m === 12 ? 1 : m + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const isToday = displayMonth === hijriDate.month.number && day === hijriDate.day;
              const event = ISLAMIC_EVENTS[displayMonth] && day >= 8 && day <= 10;

              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`
                    p-2 rounded-lg text-center text-sm font-medium
                    ${isToday 
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-200' 
                      : event 
                      ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }
                  `}
                >
                  {day}
                </motion.div>
              );
            })}
          </div>

          {/* Month Description */}
          <div className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg border border-teal-200">
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-teal-700">Hijri Month {displayMonth}:</span> {monthName}
            </p>
            {displayMonth === 9 && (
              <p className="text-xs text-slate-600 mt-1">🌙 Ramadan - Month of fasting and spiritual reflection</p>
            )}
            {displayMonth === 12 && (
              <p className="text-xs text-slate-600 mt-1">🕋️ Hajj season - Days 8-10 are the main Hajj days</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}