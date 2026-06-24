import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Moon, Star, Plus, Calendar, Bell, ArrowRightLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toHijri, toGregorian } from '@/components/utils/hijriUtils';
import { toast } from 'sonner';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

function getGregorianDate() {
  const today = new Date();
  return today.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

const EVENT_TYPES = [
  { value: 'ramadan', label: 'Ramadan', color: 'purple' },
  { value: 'eid', label: 'Eid', color: 'green' },
  { value: 'hajj', label: 'Hajj', color: 'amber' },
  { value: 'ashura', label: 'Ashura', color: 'red' },
  { value: 'mawlid', label: 'Mawlid', color: 'teal' },
  { value: 'sacred_month', label: 'Sacred Month', color: 'blue' },
  { value: 'custom', label: 'Custom', color: 'slate' }
];

export default function HijriCalendar({ compact = false }) {
  const [hijriDate, setHijriDate] = useState(null);
  const [gregorianDate] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [converterMode, setConverterMode] = useState('h2g'); // hijri to gregorian
  const [converterInput, setConverterInput] = useState({ day: '', month: 1, year: '' });
  const [converterResult, setConverterResult] = useState(null);

  const queryClient = useQueryClient();

  const [newEvent, setNewEvent] = useState({
    title: '',
    hijri_month: 1,
    hijri_day: 1,
    hijri_year: '',
    event_type: 'custom',
    description: '',
    is_recurring: true,
    reminder_enabled: true,
    reminders: [{ time_value: 1, time_unit: 'days', sent: false }],
    color: 'teal'
  });

  useEffect(() => {
    const fetchHijri = async () => {
      const hijri = await toHijri(gregorianDate);
      setHijriDate(hijri);
    };
    fetchHijri();
  }, [gregorianDate]);

  const { data: events = [] } = useQuery({
    queryKey: ['islamic-events'],
    queryFn: () => base44.entities.IslamicEvent.list('-hijri_month', 100)
  });

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate Gregorian date from Hijri
      const gregDate = await toGregorian(
        parseInt(data.hijri_year) || hijriDate.year,
        data.hijri_month,
        data.hijri_day
      );
      
      return base44.entities.IslamicEvent.create({
        ...data,
        gregorian_date: gregDate.toISOString().split('T')[0],
        hijri_year: data.hijri_year ? parseInt(data.hijri_year) : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['islamic-events']);
      setShowAddEvent(false);
      toast.success('Event added successfully!');
      setNewEvent({
        title: '',
        hijri_month: 1,
        hijri_day: 1,
        hijri_year: '',
        event_type: 'custom',
        description: '',
        is_recurring: true,
        reminder_enabled: true,
        reminders: [{ time_value: 1, time_unit: 'days', sent: false }],
        color: 'teal'
      });
    }
  });

  const handleConvert = async () => {
    try {
      if (converterMode === 'h2g') {
        // Hijri to Gregorian
        const result = await toGregorian(
          parseInt(converterInput.year),
          converterInput.month,
          parseInt(converterInput.day)
        );
        setConverterResult({
          type: 'gregorian',
          date: result.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        });
      } else {
        // Gregorian to Hijri
        const date = new Date(
          parseInt(converterInput.year),
          converterInput.month - 1,
          parseInt(converterInput.day)
        );
        const result = await toHijri(date);
        setConverterResult({
          type: 'hijri',
          date: `${result.day} ${result.monthName} ${result.year} AH`
        });
      }
    } catch (error) {
      toast.error('Invalid date');
    }
  };

  // Get upcoming events in current month
  const upcomingEvents = events.filter(e => 
    e.hijri_month === hijriDate?.month || 
    (e.hijri_month === hijriDate?.month + 1 && hijriDate?.day > 20)
  ).slice(0, 3);

  if (!hijriDate) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#0d9488] to-[#0fb8a8] border border-[#E8B84B]/40 rounded-lg px-2 py-1 text-white shadow-sm flex-shrink-0 min-w-0 max-w-[180px] sm:max-w-none"
      >
        <Moon className="w-3 h-3 flex-shrink-0 text-[#E8B84B]" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-bold text-[10px] sm:text-xs truncate">
            {hijriDate.day} {hijriDate.monthName.substring(0, 3)} {hijriDate.year} AH
          </span>
          <span className="text-[9px] sm:text-[10px] text-white/75">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 text-white border-0 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-6 h-6" />
            Islamic Calendar
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={showConverter} onOpenChange={setShowConverter}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowRightLeft className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Date Converter</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={converterMode === 'h2g' ? 'default' : 'outline'}
                      onClick={() => setConverterMode('h2g')}
                      className="flex-1"
                    >
                      Hijri → Gregorian
                    </Button>
                    <Button
                      variant={converterMode === 'g2h' ? 'default' : 'outline'}
                      onClick={() => setConverterMode('g2h')}
                      className="flex-1"
                    >
                      Gregorian → Hijri
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={converterInput.day}
                        onChange={(e) => setConverterInput({...converterInput, day: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Month</Label>
                      {converterMode === 'h2g' ? (
                        <Select 
                          value={converterInput.month.toString()} 
                          onValueChange={(v) => setConverterInput({...converterInput, month: parseInt(v)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HIJRI_MONTHS.map((m, i) => (
                              <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={converterInput.month}
                          onChange={(e) => setConverterInput({...converterInput, month: parseInt(e.target.value)})}
                        />
                      )}
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={converterInput.year}
                        onChange={(e) => setConverterInput({...converterInput, year: e.target.value})}
                        placeholder={converterMode === 'h2g' ? '1446' : '2024'}
                      />
                    </div>
                  </div>

                  <Button onClick={handleConvert} className="w-full">
                    Convert
                  </Button>

                  {converterResult && (
                    <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <p className="text-sm text-teal-600 mb-1">Result:</p>
                      <p className="text-lg font-semibold text-teal-900">{converterResult.date}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Islamic Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Event Title</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="e.g., Family Gathering"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Hijri Month</Label>
                      <Select 
                        value={newEvent.hijri_month.toString()} 
                        onValueChange={(v) => setNewEvent({...newEvent, hijri_month: parseInt(v)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HIJRI_MONTHS.map((month, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={newEvent.hijri_day}
                        onChange={(e) => setNewEvent({...newEvent, hijri_day: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Year (optional, for non-recurring)</Label>
                    <Input
                      type="number"
                      value={newEvent.hijri_year}
                      onChange={(e) => setNewEvent({...newEvent, hijri_year: e.target.value})}
                      placeholder={`e.g., ${hijriDate.year}`}
                    />
                  </div>

                  <div>
                    <Label>Event Type</Label>
                    <Select 
                      value={newEvent.event_type} 
                      onValueChange={(v) => setNewEvent({...newEvent, event_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      placeholder="Event details..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newEvent.reminder_enabled}
                      onChange={(e) => setNewEvent({...newEvent, reminder_enabled: e.target.checked})}
                      className="rounded"
                    />
                    <Label>Enable reminder</Label>
                  </div>

                  {newEvent.reminder_enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Reminders</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setNewEvent({
                            ...newEvent,
                            reminders: [...newEvent.reminders, { time_value: 1, time_unit: 'hours', sent: false }]
                          })}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {newEvent.reminders.map((reminder, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            type="number"
                            min="1"
                            value={reminder.time_value}
                            onChange={(e) => {
                              const updated = [...newEvent.reminders];
                              updated[idx] = { ...reminder, time_value: parseInt(e.target.value) || 1 };
                              setNewEvent({ ...newEvent, reminders: updated });
                            }}
                            className="w-20"
                          />
                          <Select
                            value={reminder.time_unit}
                            onValueChange={(v) => {
                              const updated = [...newEvent.reminders];
                              updated[idx] = { ...reminder, time_unit: v };
                              setNewEvent({ ...newEvent, reminders: updated });
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-slate-600">before</span>
                          {newEvent.reminders.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const updated = newEvent.reminders.filter((_, i) => i !== idx);
                                setNewEvent({ ...newEvent, reminders: updated });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    onClick={() => createEventMutation.mutate(newEvent)}
                    disabled={!newEvent.title || createEventMutation.isPending}
                    className="w-full"
                  >
                    {createEventMutation.isPending ? 'Adding...' : 'Add Event'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{hijriDate.day}</span>
            <span className="text-lg font-semibold">{hijriDate.monthName} {hijriDate.year} AH</span>
          </div>
          <div className="text-xs text-white/70 text-right">
            📅 {getGregorianDate()}
          </div>
        </div>

        {/* Special months highlight */}
        {hijriDate.monthName === 'Ramadan' && (
          <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" fill="currentColor" />
              <span className="text-sm font-medium">Blessed Month of Ramadan</span>
            </div>
          </div>
        )}
        
        {(hijriDate.monthName === 'Dhul-Hijjah' && hijriDate.day <= 10) && (
          <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" fill="currentColor" />
              <span className="text-sm font-medium">First 10 Days of Dhul-Hijjah</span>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">Upcoming Events</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {upcomingEvents.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-2 bg-white/10 rounded-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-white/70">
                          {event.hijri_day} {HIJRI_MONTHS[event.hijri_month - 1]}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {EVENT_TYPES.find(t => t.value === event.event_type)?.label}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}