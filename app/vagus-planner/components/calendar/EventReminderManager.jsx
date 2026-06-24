import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Bell, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventReminderManager({ reminders = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newReminder, setNewReminder] = useState({ minutes_before: 30, type: 'notification' });

  const addReminder = () => {
    if (onChange) {
      onChange([...reminders, { ...newReminder, sent: false }]);
    }
    setNewReminder({ minutes_before: 30, type: 'notification' });
    setShowAdd(false);
  };

  const removeReminder = (index) => {
    if (onChange) {
      onChange(reminders.filter((_, i) => i !== index));
    }
  };

  const reminderLabels = {
    5: '5 minutes before',
    10: '10 minutes before',
    15: '15 minutes before',
    30: '30 minutes before',
    60: '1 hour before',
    1440: '1 day before'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Event Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reminders.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {reminders.map((reminder, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    {reminder.type === 'notification' ? (
                      <Bell className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium">
                      {reminderLabels[reminder.minutes_before] || `${reminder.minutes_before} minutes before`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {reminder.type === 'notification' ? 'In-app' : 'Email'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removeReminder(index)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3"
          >
            <div className="flex gap-2">
              <Select value={newReminder.minutes_before.toString()} onValueChange={(value) => setNewReminder({ ...newReminder, minutes_before: parseInt(value) })}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newReminder.type} onValueChange={(value) => setNewReminder({ ...newReminder, type: value })}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addReminder} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Add
              </Button>
              <Button onClick={() => setShowAdd(false)} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {!showAdd && (
          <Button
            onClick={() => setShowAdd(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        )}
      </CardContent>
    </Card>
  );
}