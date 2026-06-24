import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus, CheckSquare, ArrowRight } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

export default function EventTaskConverter({ 
  isOpen, 
  onClose, 
  sourceType, // 'event' or 'task'
  sourceData,
  onConvert 
}) {
  const [converting, setConverting] = useState(false);
  const [convertData, setConvertData] = useState(null);

  React.useEffect(() => {
    if (sourceData && sourceType === 'event') {
      // Convert event to task
      setConvertData({
        title: sourceData.title,
        description: sourceData.description || '',
        category: sourceData.category === 'work' ? 'work' : 'personal',
        priority: 'medium',
        due_date: sourceData.start_date ? format(new Date(sourceData.start_date), 'yyyy-MM-dd') : '',
        due_time: sourceData.start_date && !sourceData.is_all_day ? format(new Date(sourceData.start_date), 'HH:mm') : '',
        estimated_minutes: sourceData.start_date && sourceData.end_date ? 
          Math.round((new Date(sourceData.end_date) - new Date(sourceData.start_date)) / 60000) : 30
      });
    } else if (sourceData && sourceType === 'task') {
      // Convert task to event
      const startDate = sourceData.due_date ? new Date(sourceData.due_date) : new Date();
      if (sourceData.due_time) {
        const [hours, minutes] = sourceData.due_time.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes));
      }
      const endDate = addMinutes(startDate, sourceData.estimated_minutes || 30);

      setConvertData({
        title: sourceData.title,
        description: sourceData.description || '',
        category: sourceData.category === 'work' ? 'work' : 'personal',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_all_day: !sourceData.due_time
      });
    }
  }, [sourceData, sourceType]);

  const handleConvert = async () => {
    setConverting(true);
    await onConvert(convertData);
    setConverting(false);
    onClose();
  };

  if (!convertData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sourceType === 'event' ? (
              <>
                <CalendarPlus className="w-5 h-5 text-teal-600" />
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <span>Convert Event to Task</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <CalendarPlus className="w-5 h-5 text-teal-600" />
                <span>Convert Task to Event</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 rounded-lg border border-teal-200 dark:border-teal-800">
            <p className="text-sm text-teal-700 dark:text-teal-300">
              {sourceType === 'event' 
                ? 'Create a task with the same details as this event. You can track progress independently.'
                : 'Schedule this task on your calendar. The event will be created based on the task deadline.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={convertData.title}
              onChange={(e) => setConvertData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {sourceType === 'event' && (
            <>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={convertData.priority} 
                  onValueChange={(val) => setConvertData(prev => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={convertData.due_date}
                    onChange={(e) => setConvertData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={convertData.due_time}
                    onChange={(e) => setConvertData(prev => ({ ...prev, due_time: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={converting}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {converting ? 'Converting...' : `Create ${sourceType === 'event' ? 'Task' : 'Event'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}