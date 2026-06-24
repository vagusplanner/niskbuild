import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const REASONS = ['Feeling unwell', 'Too busy', 'Forgot', 'Travelling', 'Rest day', 'Other'];

export default function SkipReasonModal({ isOpen, onClose, onSkip, habitName }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  const handleSkip = () => {
    onSkip(reason === 'Other' ? custom : reason);
    setReason('');
    setCustom('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Skip "{habitName}" today?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mb-3">Select a reason (optional)</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                reason === r
                  ? 'bg-teal-100 border-teal-400 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {reason === 'Other' && (
          <Textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Enter reason..."
            rows={2}
          />
        )}
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSkip} className="bg-amber-500 hover:bg-amber-600 text-white">
            Skip Day
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}