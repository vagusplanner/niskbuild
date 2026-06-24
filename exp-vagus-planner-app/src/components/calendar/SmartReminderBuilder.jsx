import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Loader2, CheckCircle2, AlertCircle, MapPin, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartReminderBuilder({ event, isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState(null);
  const [selectedReminders, setSelectedReminders] = useState(new Set());

  const loadSmartReminders = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('generateSmartReminders', {
        event: {
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location
        },
        user_location: { city: 'London' }, // TODO: get from user settings
        user_availability: { work_start: '09:00', work_end: '17:00' },
        event_type: event.category || 'event'
      });
      setReminders(data);
      // Pre-select all reminders
      setSelectedReminders(new Set(data.reminders.map((_, i) => i)));
    } catch (error) {
      console.error('Error loading smart reminders:', error);
      toast.error('Failed to generate smart reminders');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && event && !reminders) {
      loadSmartReminders();
    }
  }, [isOpen, event]);

  const handleSave = () => {
    if (reminders) {
      const selectedList = Array.from(selectedReminders)
        .map(i => reminders.reminders[i]);
      onSave(selectedList);
      onClose();
    }
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Smart Reminders for "{event.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
              <span>Analyzing event and generating smart reminders...</span>
            </div>
          ) : reminders ? (
            <>
              {/* Info Section */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">Total Preparation Time:</span>
                      <Badge variant="outline">{reminders.total_prep_time_hours}h</Badge>
                    </div>
                    {reminders.notes && (
                      <p className="text-sm text-slate-700 mt-2">{reminders.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reminders List */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Select Reminders:</p>
                <AnimatePresence>
                  {reminders.reminders.map((reminder, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => {
                        const newSelected = new Set(selectedReminders);
                        if (newSelected.has(idx)) {
                          newSelected.delete(idx);
                        } else {
                          newSelected.add(idx);
                        }
                        setSelectedReminders(newSelected);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedReminders.has(idx)
                          ? 'bg-teal-50 border-teal-500 shadow-md'
                          : 'bg-white border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center ${
                          selectedReminders.has(idx)
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedReminders.has(idx) && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-800">{reminder.title}</p>
                            <Badge className={`text-xs ${
                              reminder.type === 'prep'
                                ? 'bg-purple-100 text-purple-700'
                                : reminder.type === 'travel'
                                ? 'bg-orange-100 text-orange-700'
                                : reminder.type === 'check-in'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {reminder.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{reminder.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{reminder.time_before_minutes < 60
                              ? `${reminder.time_before_minutes}m`
                              : `${Math.round(reminder.time_before_minutes / 60)}h`} before event</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={selectedReminders.size === 0}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save {selectedReminders.size} Reminder{selectedReminders.size !== 1 ? 's' : ''}
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}