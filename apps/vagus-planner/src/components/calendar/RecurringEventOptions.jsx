import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Repeat, Edit3, Trash2 } from 'lucide-react';

export default function RecurringEventOptions({ 
  isOpen, 
  onClose, 
  onEditThis, 
  onEditSeries, 
  onDeleteThis, 
  onDeleteSeries,
  action = 'edit' // 'edit' or 'delete'
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-600" />
            {action === 'edit' ? 'Edit Recurring Event' : 'Delete Recurring Event'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This is a recurring event. Would you like to {action} just this occurrence or the entire series?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <Button
            onClick={action === 'edit' ? onEditThis : onDeleteThis}
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-2 hover:border-purple-300 hover:bg-purple-50"
          >
            <div className="flex items-start gap-3 text-left">
              {action === 'edit' ? (
                <Edit3 className="w-5 h-5 text-purple-600 mt-0.5" />
              ) : (
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <div className="font-semibold text-slate-800">This occurrence only</div>
                <div className="text-xs text-slate-500 mt-1">
                  {action === 'edit' 
                    ? 'Changes will only apply to this specific instance' 
                    : 'Only this occurrence will be deleted'}
                </div>
              </div>
            </div>
          </Button>

          <Button
            onClick={action === 'edit' ? onEditSeries : onDeleteSeries}
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-2 hover:border-purple-300 hover:bg-purple-50"
          >
            <div className="flex items-start gap-3 text-left">
              <Repeat className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800">All occurrences</div>
                <div className="text-xs text-slate-500 mt-1">
                  {action === 'edit' 
                    ? 'Changes will apply to all future occurrences of this event' 
                    : 'All occurrences of this event will be deleted'}
                </div>
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}