import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function NaturalLanguageInput({ onEventCreated, onClose }) {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedEvent, setParsedEvent] = useState(null);

  const handleParse = async () => {
    if (!input.trim()) return;

    setParsing(true);
    try {
      const response = await base44.functions.invoke('parseNaturalLanguageEvent', {
        text: input
      });

      if (response.data.success) {
        setParsedEvent(response.data.event);
      } else {
        toast.error('Could not understand that. Try: "Lunch with Sarah tomorrow at 1pm"');
      }
    } catch (error) {
      toast.error('Failed to parse event');
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = () => {
    onEventCreated(parsedEvent);
    setInput('');
    setParsedEvent(null);
    onClose?.();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !parsing) {
      handleParse();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Try: "Lunch with Sarah tomorrow at 1pm at Starbucks"'
            className="pr-10"
            autoFocus
          />
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
        </div>
        <Button
          onClick={handleParse}
          disabled={!input.trim() || parsing}
          size="sm"
          className="bg-violet-600 hover:bg-violet-700"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Parse'}
        </Button>
      </div>

      <AnimatePresence>
        {parsedEvent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
              <div className="space-y-2 mb-3">
                <div>
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Title:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{parsedEvent.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-violet-600 dark:text-violet-400">Date:</span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {new Date(parsedEvent.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-violet-600 dark:text-violet-400">Time:</span>
                    <p className="text-slate-700 dark:text-slate-300">
                      {new Date(parsedEvent.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {parsedEvent.location && (
                    <div className="col-span-2">
                      <span className="text-xs text-violet-600 dark:text-violet-400">Location:</span>
                      <p className="text-slate-700 dark:text-slate-300">{parsedEvent.location}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
                <Button
                  onClick={() => setParsedEvent(null)}
                  size="sm"
                  variant="outline"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p className="font-medium mb-1">Examples:</p>
        <ul className="space-y-0.5">
          <li>• "Team meeting next Tuesday at 3pm"</li>
          <li>• "Dinner with John tomorrow at 7:30pm at Italian restaurant"</li>
          <li>• "Dentist appointment on Friday at 2pm"</li>
        </ul>
      </div>
    </div>
  );
}