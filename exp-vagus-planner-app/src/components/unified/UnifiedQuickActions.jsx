import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Type, X, Zap, Calendar, CheckSquare, Plane, Moon, Target, Heart, Loader2, Sparkles, MicOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function UnifiedQuickActions() {
  const { t } = useTranslation();

  const QUICK_ACTIONS = [
    { id: 'new-event',   label: t('events.new'),          icon: Calendar,    color: 'from-blue-500 to-cyan-500',    page: 'Calendar',  queryParam: 'action=new-event' },
    { id: 'new-task',    label: t('tasks.addTask'),        icon: CheckSquare, color: 'from-amber-500 to-orange-500', page: 'Wellness',  queryParam: 'tab=tasks&action=new' },
    { id: 'log-prayer',  label: t('quickActions.logPrayer'), icon: Moon,      color: 'from-purple-500 to-indigo-500',page: 'Islam',     queryParam: 'tab=prayer&action=log' },
    { id: 'plan-trip',   label: t('travel.addTrip'),       icon: Plane,       color: 'from-teal-500 to-emerald-500', page: 'Travel',    queryParam: 'action=new' },
    { id: 'new-goal',    label: t('wellness.addGoal'),     icon: Target,      color: 'from-pink-500 to-rose-500',    page: 'Wellness',  queryParam: 'tab=goals&action=new' },
    { id: 'log-health',  label: t('quickActions.logHealth'), icon: Heart,     color: 'from-red-500 to-pink-500',     page: 'Wellness',  queryParam: 'tab=health&action=log' },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureMode, setCaptureMode] = useState(null); // null | 'voice' | 'type'
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (e) => {
      setInput(e.results[e.results.length - 1][0].transcript);
    };
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => { setIsListening(false); toast.error('Voice error'); };
  }, []);

  const openCapture = () => { setIsOpen(false); setShowCapture(true); setCaptureMode(null); setInput(''); };
  const closeCapture = () => {
    setShowCapture(false);
    setCaptureMode(null);
    setInput('');
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
  };

  const startVoice = () => {
    if (!recognitionRef.current) { toast.error('Voice not supported'); return; }
    setInput('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
  };

  const goBack = () => {
    if (isListening) stopVoice();
    setCaptureMode(null);
    setInput('');
  };

  const processInput = async () => {
    if (!input.trim()) return;
    setProcessing(true);
    try {
      const { data } = await SDK.functions.invoke('parseVoiceCommand', { command: input });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        
        // Handle different action types
        if (data.created) {
          const icons = { event: '📅', task: '✅', expense: '💰' };
          toast.success(`${icons[data.created.type] || '✨'} ${data.created.type} created!`);
          closeCapture();
        } else if (data.result?.read) {
          // Read commands - show result in toast
          toast.success(data.result.message, { duration: 5000 });
          closeCapture();
        } else if (data.result?.updated) {
          toast.success(data.result.message);
          closeCapture();
        } else {
          toast.error('Could not understand. Try rephrasing.');
        }
      } else {
        toast.error('Could not understand. Try rephrasing.');
      }
    } catch {
      toast.error('Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = (action) => {
    setIsOpen(false);
    navigate(`${createPageUrl(action.page)}?${action.queryParam}`);
  };

  return (
    <>
      {/* Single FAB — left side, above mobile nav */}
      <div className="fixed left-4 z-[44] lg:z-[44]" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(o => !o)}
          className={cn(
            "w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-colors ring-2",
            isOpen
              ? "bg-slate-700 ring-slate-500"
              : "bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] ring-[#E8B84B]/70 shadow-[#3ecfa0]/40"
          )}
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-5 h-5 text-white" />
          </motion.div>
        </motion.button>
      </div>

      {/* Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* backdrop — above nav but below modal sheets */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-[45]"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-4 right-4 sm:left-4 sm:right-auto sm:w-80 z-[46]"
              style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E8B84B]/30 bg-gradient-to-r from-[#1a4a6e]/5 to-[#3ecfa0]/5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#E8B84B]" /> {t('dashboard.quickActions')}
                  </span>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* AI capture */}
                <button onClick={openCapture} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1a4a6e]/8 to-[#3ecfa0]/8 hover:from-[#1a4a6e]/15 hover:to-[#3ecfa0]/15 border-b border-[#E8B84B]/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] flex items-center justify-center flex-shrink-0 ring-1 ring-[#E8B84B]/40">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#1a4a6e] dark:text-[#4ec9f8]">🎙️ Voice Assistant</p>
                    <p className="text-xs text-[#1a7ab8]/70 dark:text-[#3ecfa0]/70">Create, read, update hands-free</p>
                  </div>
                </button>

                {/* Action grid */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleAction(action)}
                        className="flex flex-col items-center gap-1.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Capture Sheet */}
      <AnimatePresence>
        {showCapture && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[55]"
              onClick={closeCapture}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[56] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-2" />

              <div className="px-4 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {captureMode && (
                      <button onClick={goBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {captureMode === 'voice' ? '🎙️ Voice Assistant' : captureMode === 'type' ? 'Type Command' : 'Voice Assistant'}
                    </h3>
                  </div>
                  <button onClick={closeCapture} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Mode selector */}
                {!captureMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCaptureMode('voice'); startVoice(); }}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      <Mic className="w-10 h-10" />
                      <span className="font-semibold">Voice</span>
                      <span className="text-xs opacity-80">Create, read, update</span>
                    </button>
                    <button
                      onClick={() => setCaptureMode('type')}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all"
                    >
                      <Type className="w-10 h-10" />
                      <span className="font-semibold">Type</span>
                      <span className="text-xs opacity-80">Text commands</span>
                    </button>
                  </div>
                )}

                {/* Voice mode */}
                {captureMode === 'voice' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 py-4">
                      {isListening ? (
                        <>
                          <motion.button
                            animate={{ scale: [1, 1.12, 1] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            onClick={stopVoice}
                            className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg"
                          >
                            <MicOff className="w-9 h-9 text-white" />
                          </motion.button>
                          <p className="text-sm text-slate-500">Listening... Tap to stop</p>
                          <p className="text-xs text-slate-400 mt-2">Try: "Add meeting tomorrow 3pm", "Read my next task", "Add expense 50 food"</p>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={startVoice}
                            className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors"
                          >
                            <Mic className="w-9 h-9 text-white" />
                          </button>
                          <p className="text-sm text-slate-500">Tap to speak</p>
                          <p className="text-xs text-slate-400 mt-2 text-center max-w-xs">Say: "Add meeting tomorrow at 3pm"<br/>"Read my next task"<br/>"Add expense 50 for food"</p>
                        </>
                      )}
                    </div>
                    {input && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 border">
                        "{input}"
                      </div>
                    )}
                    {input && !isListening && (
                      <div className="flex gap-2">
                        <Button onClick={processInput} disabled={processing} className="flex-1 bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] hover:opacity-90 border border-[#E8B84B]/30">
                          {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {processing ? t('quickActions.creating') : t('common.create')}
                        </Button>
                        <Button onClick={() => setInput('')} variant="outline">{t('common.clear')}</Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Type mode */}
                {captureMode === 'type' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) processInput(); }}
                        placeholder="e.g. Add meeting tomorrow 3pm, Read my tasks, Add expense 50 food"
                        autoFocus
                        className="text-base"
                      />
                    </div>
                    <Button onClick={processInput} disabled={processing || !input.trim()} className="w-full bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] hover:opacity-90 border border-[#E8B84B]/30">
                      {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : 'Execute Command'}
                    </Button>
                    <p className="text-xs text-slate-500 text-center">
                      Examples: "Add meeting tomorrow 3pm" · "Read my next task" · "Add expense 50 food"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}