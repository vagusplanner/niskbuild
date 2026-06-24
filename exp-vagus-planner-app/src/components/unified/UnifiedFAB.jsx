/**
 * UnifiedFAB — merges Quick Actions (+), AI Assistant (Brain), 
 * Voice Capture (Mic) and AI Context into a single expandable FAB.
 * Replaces: UnifiedQuickActions FAB + UnifiedAIButton + VoiceFAB
 * All functionality is preserved — just accessed via one button.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, X, Brain, Mic, Plus, Calendar, CheckSquare,
  Plane, Moon, Target, Heart, Sparkles, Type,
  Loader2, MicOff, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import VoiceCaptureHub from '@/components/voice/VoiceCaptureHub';
import UnifiedContextSidebar from '@/components/ai/UnifiedContextSidebar';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';

// Page-specific AI colors
const PAGE_COLORS = {
  Calendar:  { gradient: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)', ring: '#3b82f6' },
  Travel:    { gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', ring: '#f59e0b' },
  Wellness:  { gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)', ring: '#f43f5e' },
  Islam:     { gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', ring: '#a855f7' },
  Dashboard: { gradient: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)', ring: '#0d9488' },
  Finance:   { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', ring: '#10b981' },
};
const DEFAULT_COLOR = { gradient: 'linear-gradient(135deg, #E8B84B 0%, #f0c060 100%)', ring: '#E8B84B' };

export default function UnifiedFAB() {
  const { t } = useTranslation();
  const { isIslamicEdition } = useIslamicEdition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState(null); // null | 'quickactions' | 'ai' | 'voice' | 'capture_voice' | 'capture_type'
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const recognitionRef = React.useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = location.pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  const aiColors = PAGE_COLORS[currentPage] || DEFAULT_COLOR;

  const QUICK_ACTIONS = [
    { id: 'new-event',  label: t('events.new'),            icon: Calendar,    color: 'from-blue-500 to-cyan-500',    page: 'Calendar',  queryParam: 'action=new-event' },
    { id: 'new-task',   label: t('tasks.addTask'),          icon: CheckSquare, color: 'from-amber-500 to-orange-500', page: 'Wellness',  queryParam: 'tab=tasks&action=new' },
    ...(isIslamicEdition ? [{ id: 'log-prayer', label: t('quickActions.logPrayer'), icon: Moon, color: 'from-purple-500 to-indigo-500', page: 'Islam', queryParam: 'tab=prayer&action=log' }] : []),
    { id: 'itinerary',  label: 'Itinerary AI',                icon: Plane,       color: 'from-sky-500 to-blue-500',    page: 'ItineraryAssistant', queryParam: '' },
    { id: 'new-goal',   label: t('wellness.addGoal'),       icon: Target,      color: 'from-pink-500 to-rose-500',    page: 'Wellness',  queryParam: 'tab=goals&action=new' },
    { id: 'log-health', label: t('quickActions.logHealth'), icon: Heart,       color: 'from-red-500 to-pink-500',     page: 'Wellness',  queryParam: 'tab=health&action=log' },
  ];

  // Voice command (speech recognition — quick text commands)
  React.useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => setInput(e.results[e.results.length - 1][0].transcript);
    r.onend = () => setIsListening(false);
    r.onerror = () => { setIsListening(false); toast.error('Voice error'); };
    recognitionRef.current = r;
  }, []);

  const close = () => {
    setMenuOpen(false);
    setMode(null);
    setInput('');
    if (isListening) recognitionRef.current?.stop();
  };

  const openMode = (m) => { setMenuOpen(false); setMode(m); };

  const startVoice = () => {
    if (!recognitionRef.current) { toast.error('Voice not supported in this browser'); return; }
    setInput('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopVoice = () => recognitionRef.current?.stop();

  const processCommand = async () => {
    if (!input.trim()) return;
    setProcessing(true);
    try {
      const { data } = await SDK.functions.invoke('parseVoiceCommand', { command: input });
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        const icons = { event: '📅', task: '✅', expense: '💰' };
        if (data.created) toast.success(`${icons[data.created.type] || '✨'} Created!`);
        else if (data.result?.message) toast.success(data.result.message, { duration: 5000 });
        else toast.error('Could not understand. Try rephrasing.');
        close();
      } else {
        toast.error('Could not understand. Try rephrasing.');
      }
    } catch { toast.error('Failed to process command'); }
    finally { setProcessing(false); }
  };

  const handleQuickAction = (action) => {
    close();
    navigate(`${createPageUrl(action.page)}?${action.queryParam}`);
  };

  // The 3 menu items that appear above the main FAB
  const MENU_ITEMS = [
    {
      id: 'hub',
      icon: Plus,
      label: 'Capture Hub',
      desc: 'Voice, Type, Travel…',
      bg: '',
      style: { background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4A65 100%)' },
      onClick: () => { close(); navigate(createPageUrl('CaptureHub')); },
    },
    {
      id: 'ai',
      icon: Brain,
      label: 'AI Assistant',
      desc: 'Context-aware AI',
      bg: '',
      style: { background: 'linear-gradient(135deg, #0D4F6C 0%, #1D6FB8 100%)' },
      onClick: () => { setMenuOpen(false); setShowAISidebar(true); },
    },
    {
      id: 'voice',
      icon: Mic,
      label: 'Voice Capture',
      desc: 'Record & AI route',
      bg: '',
      style: { background: 'linear-gradient(135deg, #1D6FB8 0%, #29ABE2 100%)' },
      onClick: () => openMode('voice'),
    },
  ];

  const hasOpenPanel = mode !== null;

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {(menuOpen || hasOpenPanel) && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[49]"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* ── Menu items (stacked above FAB) ── */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed z-[51] flex flex-col items-center gap-2"
            style={{ bottom: 'calc(8.5rem + env(safe-area-inset-bottom))', right: '1rem' }}>
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.85 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 350, damping: 26 }}
                  className="flex items-center gap-2"
                >
                  {/* Label pill */}
                  <div className="px-3 py-1.5 rounded-full shadow-lg" style={{background:'#D4E0EC', border:'1px solid rgba(122,158,181,0.4)'}}>
                    <p className="text-xs font-semibold whitespace-nowrap" style={{color:'#1B2A4A'}}>{item.label}</p>
                    <p className="text-[10px] whitespace-nowrap" style={{color:'#4A6E8A'}}>{item.desc}</p>
                  </div>
                  {/* Icon button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={item.onClick}
                    className={cn(
                      'w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white',
                      item.bg ? `bg-gradient-to-br ${item.bg}` : ''
                    )}
                    style={item.style || {}}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ── Panels ── */}
      <AnimatePresence>
        {mode === 'voice' && (
          <motion.div
            key="voice-panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-[51] inset-x-3 sm:inset-x-auto sm:right-4 sm:w-[440px]"
            style={{ bottom: 'calc(12rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <VoiceCaptureHub onClose={close} />
          </motion.div>
        )}

        {mode === 'quickactions' && (
          <motion.div
            key="qa-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-[51] inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80"
            style={{ bottom: 'calc(12rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="rounded-2xl shadow-2xl overflow-hidden" style={{background:'#D4E0EC', border:'1px solid rgba(74,110,138,0.4)'}}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:'1px solid rgba(74,110,138,0.25)', background:'rgba(29,111,184,0.08)'}}>
                <span className="font-semibold flex items-center gap-2" style={{color:'#1B2A4A'}}>
                  <Zap className="w-4 h-4" style={{color:'#1D6FB8'}} /> {t('dashboard.quickActions')}
                </span>
                <button onClick={close} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* AI text command entry */}
              {mode === 'quickactions' && (
                <button onClick={() => setMode('cmd_type')} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1a4a6e]/8 to-[#3ecfa0]/8 hover:from-[#1a4a6e]/15 hover:to-[#3ecfa0]/15 border-b border-[#E8B84B]/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] flex items-center justify-center ring-1 ring-[#E8B84B]/40">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#1a4a6e] dark:text-[#4ec9f8]">🎙️ Voice/Text Command</p>
                    <p className="text-xs text-[#1a7ab8]/70 dark:text-[#3ecfa0]/70">Create anything hands-free</p>
                  </div>
                </button>
              )}

              {/* Action grid */}
              <div className="grid grid-cols-3 gap-0" style={{borderTop:'1px solid rgba(74,110,138,0.15)'}}>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.id} onClick={() => handleQuickAction(action)}
                      className="flex flex-col items-center gap-1.5 p-3 transition-colors hover:bg-[#A8C8E8]/20"
                      style={{borderRight:'1px solid rgba(74,110,138,0.12)', borderBottom:'1px solid rgba(74,110,138,0.12)'}}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)'}}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight" style={{color:'#1B2A4A'}}>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Text command panel */}
        {mode === 'cmd_type' && (
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed z-[51] inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80"
            style={{ bottom: 'calc(12rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button onClick={() => setMode('quickactions')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex-1">AI Command</span>
                <button onClick={close} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => { setMode('cmd_voice'); startVoice(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity">
                    <Mic className="w-7 h-7" />
                    <span className="text-xs font-semibold">Voice</span>
                  </button>
                  <button onClick={() => setMode('cmd_text')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:opacity-90 transition-opacity">
                    <Type className="w-7 h-7" />
                    <span className="text-xs font-semibold">Type</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice command mode */}
        {mode === 'cmd_voice' && (
          <motion.div
            key="cmd-voice"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed z-[51] inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80"
            style={{ bottom: 'calc(12rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setMode('cmd_type')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex-1">🎙️ Voice Command</span>
                <button onClick={close}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="flex flex-col items-center gap-3 py-2">
                {isListening ? (
                  <>
                    <motion.button animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                      onClick={stopVoice} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <MicOff className="w-8 h-8 text-white" />
                    </motion.button>
                    <p className="text-sm text-slate-500">Listening… tap to stop</p>
                  </>
                ) : (
                  <>
                    <button onClick={startVoice} className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-colors">
                      <Mic className="w-8 h-8 text-white" />
                    </button>
                    <p className="text-sm text-slate-500">Tap to speak</p>
                  </>
                )}
                <p className="text-xs text-slate-400 text-center">e.g. "Add meeting tomorrow 3pm" · "Log expense £50 food"</p>
              </div>
              {input && <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 border">"{input}"</div>}
              {input && !isListening && (
                <div className="flex gap-2">
                  <Button onClick={processCommand} disabled={processing} className="flex-1 bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] hover:opacity-90">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {processing ? 'Processing…' : 'Execute'}
                  </Button>
                  <Button onClick={() => setInput('')} variant="outline">Clear</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Text command mode */}
        {mode === 'cmd_text' && (
          <motion.div
            key="cmd-text"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed z-[51] inset-x-3 sm:inset-x-auto sm:right-4 sm:w-80"
            style={{ bottom: 'calc(12rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setMode('cmd_type')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-100 flex-1">Type Command</span>
                <button onClick={close}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <Input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) processCommand(); }}
                placeholder="Add meeting tomorrow 3pm…" autoFocus className="text-base" />
              <Button onClick={processCommand} disabled={processing || !input.trim()} className="w-full bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] hover:opacity-90">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing…</> : 'Execute Command'}
              </Button>
              <p className="text-xs text-slate-400 text-center">Examples: "Add meeting tomorrow 3pm" · "Add expense 50 food"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Sidebar ── */}
      <UnifiedContextSidebar isOpen={showAISidebar} onClose={() => setShowAISidebar(false)} />

      {/* ── Main FAB ── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => { if (hasOpenPanel) { close(); } else { setMenuOpen(o => !o); } }}
        className="fixed z-[50] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all"
        style={{
          bottom: 'calc(8rem + env(safe-area-inset-bottom))',
          right: '1rem',
          background: menuOpen || hasOpenPanel
          ? 'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 100%)'
          : 'linear-gradient(135deg, #1D6FB8 0%, #29ABE2 100%)',
          boxShadow: '0 4px 20px rgba(41,171,226,0.4), 0 2px 8px rgba(13,26,42,0.3)',
          ring: 'none',
        }}
        title="Actions"
      >
        <AnimatePresence mode="wait" initial={false}>
          {menuOpen || hasOpenPanel ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle pulse when idle */}
        {!menuOpen && !hasOpenPanel && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{background:'rgba(41,171,226,0.25)'}}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}