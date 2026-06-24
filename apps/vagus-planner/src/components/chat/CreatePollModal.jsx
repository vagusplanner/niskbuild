import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart2, Plus, X } from 'lucide-react';

export default function CreatePollModal({ open, onOpenChange, onCreatePoll }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => setOptions(o => [...o, '']);
  const removeOption = (i) => setOptions(o => o.filter((_, idx) => idx !== i));
  const updateOption = (i, val) => setOptions(o => o.map((opt, idx) => idx === i ? val : opt));

  const handleCreate = () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    onCreatePoll({
      question: question.trim(),
      options: validOptions.map(text => ({ text, votes: [] }))
    });
    setQuestion('');
    setOptions(['', '']);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-teal-600" />
            Create Poll
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <Input
            placeholder="Ask a question…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</p>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium mt-1">
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={handleCreate}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            >
              Create Poll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}