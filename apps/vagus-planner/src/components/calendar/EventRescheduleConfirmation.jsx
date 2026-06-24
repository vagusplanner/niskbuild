import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function EventRescheduleConfirmation({ 
  isOpen, 
  onClose, 
  event, 
  oldDate, 
  newDate,
  onConfirm 
}) {
  if (!event || !oldDate || !newDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Reschedule</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {event.title}
            </h4>
            {event.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {event.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>From:</span>
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {format(new Date(oldDate), 'EEEE, MMMM d, yyyy')}
                </div>
                {!event.is_all_day && (
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(oldDate), 'h:mm a')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-teal-600" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>To:</span>
                </div>
                <div className="font-semibold text-teal-600 dark:text-teal-400">
                  {format(new Date(newDate), 'EEEE, MMMM d, yyyy')}
                </div>
                {!event.is_all_day && (
                  <div className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(newDate), 'h:mm a')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-teal-600 hover:bg-teal-700">
            Confirm Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}