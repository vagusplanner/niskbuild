import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, CheckCircle2, Calendar, ListChecks, Trash2, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = {
  work: 'bg-blue-100 text-blue-700',
  personal: 'bg-purple-100 text-purple-700',
  health: 'bg-green-100 text-green-700',
  shopping: 'bg-orange-100 text-orange-700',
  learning: 'bg-indigo-100 text-indigo-700',
  home: 'bg-yellow-100 text-yellow-700',
  other: 'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

function ExtractedItem({ item, onRemove, onToggleType }) {
  const isEvent = item.type === 'event';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
    >
      <button
        onClick={() => onToggleType(item.id)}
        className={cn(
          'mt-0.5 p-1.5 rounded-lg flex-shrink-0 transition-colors',
          isEvent ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'
        )}
        title={`Switch to ${isEvent ? 'task' : 'event'}`}
      >
        {isEvent ? <Calendar className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Badge className={cn('text-[10px] py-0 border', PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium)}>
            {item.priority}
          </Badge>
          <Badge className={cn('text-[10px] py-0 border-0', CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other)}>
            {item.category}
          </Badge>
          {item.due_date && (
            <Badge variant="outline" className="text-[10px] py-0 text-slate-500">
              📅 {item.due_date}{item.due_time ? ` ${item.due_time}` : ''}
            </Badge>
          )}
          {item.estimated_minutes && !isEvent && (
            <Badge variant="outline" className="text-[10px] py-0 text-slate-500">
              ⏱ {item.estimated_minutes}min
            </Badge>
          )}
          {isEvent && item.event_start_time && (
            <Badge variant="outline" className="text-[10px] py-0 text-slate-500">
              🕐 {item.event_start_time}{item.event_end_time ? ` – ${item.event_end_time}` : ''}
            </Badge>
          )}
        </div>
      </div>

      <button onClick={() => onRemove(item.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function VoiceTaskCapture({ onItemsSaved }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [mode, setMode] = useState('idle'); // idle | recording | extracted | saved
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported in this browser. Please type your tasks instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim += t;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      if (e.error !== 'no-speech') toast.error('Voice recognition error. Try again.');
      setIsRecording(false);
      setMode('idle');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setTranscript('');
    setMode('recording');
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const extractItems = async (text) => {
    if (!text.trim()) return;
    setExtracting(true);
    try {
      const res = await SDK.functions.invoke('voiceTaskExtractor', { transcript: text });
      const data = res.data;
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      const itemsWithIds = (data.extracted || []).map((item, i) => ({ ...item, id: `item-${Date.now()}-${i}` }));
      setItems(itemsWithIds);
      setSummary(data.summary || '');
      setMode('extracted');
    } catch (err) {
      toast.error('Could not extract tasks: ' + err.message);
    }
    setExtracting(false);
  };

  const handleStopAndExtract = async () => {
    stopRecording();
    const text = transcript || manualText;
    await extractItems(text);
  };

  const handleManualExtract = () => extractItems(manualText);

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const toggleItemType = (id) => setItems(prev =>
    prev.map(i => i.id === id ? { ...i, type: i.type === 'task' ? 'event' : 'task' } : i)
  );

  const saveAll = async () => {
    if (!items.length) return;
    setSaving(true);
    let savedTasks = 0, savedEvents = 0;

    const today = new Date().toISOString().split('T')[0];

    for (const item of items) {
      try {
        if (item.type === 'task') {
          await SDK.entities.Task.create({
            title: item.title,
            priority: item.priority || 'medium',
            category: item.category || 'personal',
            due_date: item.due_date || null,
            due_time: item.due_time || null,
            estimated_minutes: item.estimated_minutes || null,
            notes: item.notes || '',
            status: 'todo',
          });
          savedTasks++;
        } else {
          // Build start/end datetimes
          const dateStr = item.due_date || today;
          const startTimeStr = item.event_start_time || '09:00';
          const endTimeStr = item.event_end_time || '09:30';
          const startDate = new Date(`${dateStr}T${startTimeStr}:00`);
          const endDate = new Date(`${dateStr}T${endTimeStr}:00`);
          if (endDate <= startDate) endDate.setTime(startDate.getTime() + 30 * 60000);

          await SDK.entities.Event.create({
            title: item.title,
            description: item.notes || '',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_all_day: false,
            category: ['work', 'personal', 'health', 'prayer', 'holiday', 'family', 'social', 'other'].includes(item.category)
              ? item.category : 'personal',
            source: 'app',
          });
          savedEvents++;
        }
      } catch (err) {
        console.error('Save error for item:', item.title, err.message);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await queryClient.invalidateQueries({ queryKey: ['todayEvents'] });
    await queryClient.invalidateQueries({ queryKey: ['activeTasks'] });

    toast.success(`Saved ${savedTasks} task${savedTasks !== 1 ? 's' : ''} and ${savedEvents} event${savedEvents !== 1 ? 's' : ''}!`);
    setMode('saved');
    setItems([]);
    setTranscript('');
    setManualText('');
    setSummary('');
    onItemsSaved?.({ savedTasks, savedEvents });
    setTimeout(() => setMode('idle'), 1500);
    setSaving(false);
  };

  const reset = () => {
    stopRecording();
    setMode('idle');
    setItems([]);
    setTranscript('');
    setManualText('');
    setSummary('');
  };

  return (
    <div className="space-y-4">
      {/* Mic Button */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={isRecording ? handleStopAndExtract : startRecording}
          disabled={extracting || saving}
          className={cn(
            'relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all',
            isRecording
              ? 'bg-red-500 text-white ring-4 ring-red-200 ring-offset-2'
              : 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
          )}
        >
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-400 opacity-40"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          {isRecording ? <MicOff className="w-8 h-8 relative z-10" /> : <Mic className="w-8 h-8" />}
        </motion.button>

        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
          {isRecording ? 'Listening… tap to stop & extract' :
           extracting ? 'Extracting tasks with AI…' :
           mode === 'saved' ? '✅ All saved!' :
           'Tap to speak your tasks & errands'}
        </p>

        {/* Live transcript */}
        <AnimatePresence>
          {(isRecording || transcript) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 leading-relaxed min-h-[56px]"
            >
              {transcript || <span className="text-slate-400 italic">Speak now…</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OR — Manual text input */}
      {mode === 'idle' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && manualText.trim() && handleManualExtract()}
            placeholder="Or type: 'Buy milk, dentist Friday 3pm, finish report…'"
            className="flex-1 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-400"
          />
          <Button
            size="sm"
            onClick={handleManualExtract}
            disabled={!manualText.trim() || extracting}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 rounded-xl"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Loading spinner */}
      {extracting && (
        <div className="flex items-center justify-center gap-2 py-6 text-teal-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">AI is extracting your tasks…</span>
        </div>
      )}

      {/* Extracted items */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic px-1">{summary}</p>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {items.length} item{items.length !== 1 ? 's' : ''} extracted
              </span>
              <div className="flex gap-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-0.5"><ListChecks className="w-3 h-3 text-amber-500" /> = task</span>
                <span className="mx-1">·</span>
                <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3 text-teal-500" /> = event</span>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <AnimatePresence>
                {items.map(item => (
                  <ExtractedItem key={item.id} item={item} onRemove={removeItem} onToggleType={toggleItemType} />
                ))}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={reset} className="flex-1">
                Clear
              </Button>
              <Button
                size="sm"
                onClick={saveAll}
                disabled={saving}
                className="flex-2 bg-teal-600 hover:bg-teal-700 text-white gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save All to Calendar & Tasks
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'saved' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center gap-2 py-4 text-teal-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">Everything saved!</span>
        </motion.div>
      )}
    </div>
  );
}