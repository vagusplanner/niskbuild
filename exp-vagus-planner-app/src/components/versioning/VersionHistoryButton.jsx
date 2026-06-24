import React, { useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import VersionHistoryPanel from './VersionHistoryPanel';

export default function VersionHistoryButton({ entityType, entityId, variant = 'ghost', size = 'sm', label = true }) {
  const [open, setOpen] = useState(false);

  if (!entityId) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300"
      >
        <History className="w-4 h-4" />
        {label && <span>History</span>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <VersionHistoryPanel
            entityType={entityType}
            entityId={entityId}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}