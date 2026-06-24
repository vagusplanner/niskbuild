/**
 * CaptureHub — Unified input centre
 * Tabs: Voice | Type | Travel | WhatsApp
 * All existing functions are preserved and connected.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Type, Plane, MessageCircle, Info, X, Calendar, CheckSquare, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import VoiceTaskCapture from '@/components/voice/VoiceTaskCapture';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const TABS = [
  {
    id: 'voice',
    icon: Mic,
    label: 'Voice',
    color: 'from-[#1D6FB8] to-[#29ABE2]',
    tip: '🎙️ Tap the microphone and speak naturally — say things like "Doctor appointment Tuesday 3pm" or "Buy groceries, call mum, finish report by Friday". AI extracts every task & event automatically.',
  },
  {
    id: 'type',
    icon: Type,
    label: 'Type',
    color: 'from-[#1B2A4A] to-[#2D4A65]',
    tip: '⌨️ Type any command in plain English. Examples: "Add meeting tomorrow 10am", "Log £45 grocery expense", "Remind me to pray Fajr". The AI figures out what to create and where to save it.',
  },
  {
    id: 'travel',
    icon: Plane,
    label: 'Travel',
    color: 'from-[#2D4A65] to-[#4A6E8A]',
    tip: '✈️ Paste your flight/hotel confirmation email or booking text. AI reads it, extracts all dates and events, and adds them to your Calendar automatically — with optional prayer time reminders.',
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'from-[#0D4F6C] to-[#1D6FB8]',
    tip: '💬 Connect your WhatsApp to Vagus Planner. Once connected, send a message like "Add gym tomorrow 7am" directly from WhatsApp and it will appear in your Calendar & Tasks instantly.',
  },
];

// ── Type/Text command tab ─────────────────────────────────────────────────────
function TypeTab() {
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const EXAMPLES = [
    'Add meeting tomorrow 3pm with team',
    'Log £50 grocery expense',
    'Dentist appointment Friday 10am',
    'Remind me about Jumu\'ah this Friday',
    'Buy milk, eggs, bread',
    'Call mum this evening',
  ];

  const run = async (cmd) => {
    const text = cmd || input;
    if (!text.trim()) return;
    setProcessing(true);
    try {
      const { data } = await base44.functions.invoke('parseVoiceCommand', { command: text });
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        const icons = { event: '📅', task: '✅', expense: '💰' };
        if (data.created) toast.success(`${icons[data.created.type] || '✨'} Created: ${data.created.title || 'done'}!`);
        else toast.success('Done!');
        setInput('');
      } else {
        toast.error('Could not understand — try rephrasing');
      }
    } catch {
      toast.error('Failed to process command');
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) run(); }}
          placeholder="Type anything… 'Meeting tomorrow 3pm'"
          className="text-base border-[#2979C5]/30 focus:ring-[#2979C5]"
          autoFocus
        />
        <Button
          onClick={() => run()}
          disabled={!input.trim() || processing}
          className="bg-[#2979C5] hover:bg-[#152244] text-white px-5"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick examples — tap to use:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => run(ex)}
              disabled={processing}
              className="text-xs px-3 py-1.5 rounded-full bg-[#2979C5]/10 text-[#2979C5] hover:bg-[#2979C5]/20 border border-[#2979C5]/20 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Connected to */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800/40 dark:border-slate-700 p-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saves directly to:</p>
        <div className="flex gap-3 flex-wrap">
          {[['📅','Calendar'], ['✅','Tasks'], ['💰','Finance'], ['🎯','Goals']].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg shadow-sm">{icon} {label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Travel tab ────────────────────────────────────────────────────────────────
function TravelTab() {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const { data } = await base44.functions.invoke('parseTravelMessage', { message: text });
      if (data?.events?.length) {
        setEvents(data.events);
        toast.success(`Found ${data.events.length} travel event(s)!`);
      } else {
        toast.error('No travel events found — try pasting a booking confirmation.');
      }
    } catch {
      toast.error('Could not parse — try again');
    }
    setParsing(false);
  };

  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    for (const ev of events) {
      try {
        await base44.entities.Event.create({
          title: ev.title || ev.type || 'Travel',
          description: ev.description || '',
          start_date: ev.start_date || new Date().toISOString(),
          end_date: ev.end_date || new Date().toISOString(),
          category: 'other',
          source: 'app',
        });
        saved++;
      } catch (_) {}
    }
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`${saved} travel event(s) added to Calendar!`);
    setEvents([]);
    setText('');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your flight confirmation, hotel booking, or travel itinerary email here…"
        rows={6}
        className="w-full px-3 py-2.5 text-sm border border-[#2979C5]/30 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2979C5] resize-none placeholder:text-slate-400"
      />
      <Button
        onClick={parse}
        disabled={!text.trim() || parsing}
        className="w-full bg-[#2979C5] hover:bg-[#152244] text-white"
      >
        {parsing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Parsing…</> : '✈️ Extract Travel Events'}
      </Button>

      {events.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{events.length} events found:</p>
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#2979C5]/5 rounded-xl border border-[#2979C5]/20">
              <Calendar className="w-4 h-4 text-[#2979C5] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{ev.title || ev.type}</p>
                <p className="text-xs text-slate-500">{ev.start_date ? new Date(ev.start_date).toLocaleDateString() : ''}</p>
              </div>
            </div>
          ))}
          <Button onClick={saveAll} disabled={saving} className="w-full bg-[#152244] hover:bg-[#2979C5] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
            Add All to Calendar
          </Button>
        </div>
      )}

      <div className="text-center">
        <Link to={createPageUrl('ItineraryAssistant')} className="text-xs text-[#2979C5] underline underline-offset-2">
          Open full Itinerary Assistant with prayer reminders →
        </Link>
      </div>
    </div>
  );
}

// ── WhatsApp tab ──────────────────────────────────────────────────────────────
function WhatsAppTab() {
  const [copied, setCopied] = useState(false);
  const botNumber = '+447700900000';

  const copy = () => {
    navigator.clipboard.writeText(botNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 p-5 text-center">
        <MessageCircle className="w-12 h-12 text-[#25D366] mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Connect WhatsApp</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Send tasks & events directly from WhatsApp — no app needed</p>
      </div>

      <div className="space-y-3">
        {[
          ['1', 'Save this number in your contacts', botNumber, true],
          ['2', 'Open WhatsApp and send a message', '"Add gym tomorrow 7am"', false],
          ['3', 'Your event appears in Calendar', 'Automatically!', false],
        ].map(([step, title, sub, copyable]) => (
          <div key={step} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-[#25D366] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
            {copyable && (
              <button onClick={copy} className="text-xs text-[#25D366] font-semibold px-2 py-1 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors">
                {copied ? '✓' : 'Copy'}
              </button>
            )}
          </div>
        ))}
      </div>

      <Link to={createPageUrl('WhatsAppImport')}>
        <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
          <MessageCircle className="w-4 h-4 mr-2" /> Full WhatsApp Setup →
        </Button>
      </Link>
    </div>
  );
}

// ── Main CaptureHub ───────────────────────────────────────────────────────────
export default function CaptureHub() {
  const [activeTab, setActiveTab] = useState('voice');
  const [showTip, setShowTip] = useState(true);

  const tab = TABS.find(t => t.id === activeTab);

  // Auto-hide tip after 8s
  useEffect(() => {
    setShowTip(true);
    const t = setTimeout(() => setShowTip(false), 8000);
    return () => clearTimeout(t);
  }, [activeTab]);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-5 shadow-lg" style={{background:'linear-gradient(135deg, #0D1A2A 0%, #1B2A4A 35%, #2D4A65 70%, #4A6E8A 100%)'}}>
        <div className="flex items-center gap-3 mb-1">
          <Navigation className="w-5 h-5 text-white/80" />
          <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Capture Hub</span>
        </div>
        <h1 className="text-2xl font-black text-white">Add Anything</h1>
        <p className="text-sm text-white/70 mt-0.5">Voice · Type · Travel · WhatsApp — all connected to Calendar, Tasks & more</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all border',
                isActive
                  ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-md`
                  : 'border-[#D4E0EC] hover:border-[#7BB8D4]'
              )}
              style={!isActive ? {background:'rgba(212,224,236,0.15)', color:'#4A6E8A'} : {}}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inline tip banner */}
      <AnimatePresence>
        {showTip && tab && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-[#2979C5]/8 border border-[#2979C5]/25"
          >
            <Info className="w-4 h-4 text-[#2979C5] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">{tab.tip}</p>
            <button onClick={() => setShowTip(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
        >
          {activeTab === 'voice' && <VoiceTaskCapture />}
          {activeTab === 'type' && <TypeTab />}
          {activeTab === 'travel' && <TravelTab />}
          {activeTab === 'whatsapp' && <WhatsAppTab />}
        </motion.div>
      </AnimatePresence>

      {/* Connected modules strip */}
      <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 p-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Everything you add here connects to:</p>
        <div className="flex flex-wrap gap-2">
          {[
            ['📅','Calendar','/Calendar'],
            ['✅','Tasks','/Calendar'],
            ['✈️','Travel','/Travel'],
            ['🎯','Goals','/Goals'],
            ['💰','Finance','/Finance'],
            ['🕌','Islam','/Islam'],
          ].map(([icon, label, path]) => (
            <Link key={label} to={path}
              className="flex items-center gap-1 text-xs text-[#2979C5] bg-[#2979C5]/8 px-2.5 py-1 rounded-full hover:bg-[#2979C5]/15 transition-colors border border-[#2979C5]/20">
              {icon} {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}