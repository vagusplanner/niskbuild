import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import {
  Moon, CheckSquare, MessageCircle, Target, Activity, Plane,
  CalendarPlus, Sparkles, Users, StickyNote, Settings,
  CloudSun, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// NSC Palette Bleue tokens
const C = {
  cyan:      '#29ABE2',
  royal:     '#1D6FB8',
  navy:      '#1B2A4A',
  tealDark:  '#0D4F6C',
  blueMed:   '#2980B9',
  indigo:    '#4A55A2',
  blueGray:  '#607B8B',
  nearBlack: '#0D2B2B',
  lightBlue: '#A8C8E8',
  sky:       '#7BB8D4',
  deepTeal:  '#0A3333',
  mauve:     '#9B8EA0',
  blueGray2: '#8A9BB0',
  blush:     '#DDD5DC',
  ice:       '#D4E0EC',
  steel:     '#7A9EB5',
  slate:     '#4A6E8A',
  darkSteel: '#2D4A65',
  darkest:   '#0D1A2A',
};

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOL_GROUPS = [
  {
    label: 'Navigate',
    tools: [
      { id: 'islam',    icon: Moon,          label: 'Islam',    action: 'nav:Islam',          bg: C.tealDark,  fg: C.cyan },
      { id: 'tasks',    icon: CheckSquare,   label: 'Tasks',    action: 'nav:Calendar',       bg: C.darkSteel, fg: C.ice },
      { id: 'goals',    icon: Target,        label: 'Goals',    action: 'nav:Goals',          bg: C.slate,     fg: C.lightBlue },
      { id: 'connect',  icon: MessageCircle, label: 'Chat',     action: 'nav:Connect',        bg: C.royal,     fg: C.ice },
      { id: 'wellness', icon: Activity,      label: 'Wellness', action: 'nav:Wellness',       bg: C.darkSteel, fg: C.sky },
      { id: 'travel',   icon: Plane,         label: 'Travel',   action: 'nav:Travel',         bg: C.indigo,    fg: C.lightBlue },
    ]
  },
  {
    label: 'Quick Actions',
    tools: [
      { id: 'add_event',   icon: CalendarPlus,  label: 'Add Event',  action: 'event:add_event',         bg: C.royal,    fg: C.ice },
      { id: 'ai_quick',    icon: Sparkles,      label: 'AI Add',     action: 'event:open_super_agent',  bg: C.tealDark, fg: C.cyan },
      { id: 'meeting',     icon: Users,         label: 'Meeting',    action: 'event:open_meeting',      bg: C.slate,    fg: C.lightBlue },
      { id: 'quick_notes', icon: StickyNote,    label: 'Notes',      action: 'event:open_quick_notes',  bg: C.darkSteel,fg: C.ice },
      { id: 'whatsapp',    icon: MessageCircle, label: 'WhatsApp',   action: 'nav:WhatsAppImport',      bg: C.blueGray, fg: C.ice },
      { id: 'capture',     icon: Zap,           label: 'Capture',    action: 'nav:CaptureHub',          bg: C.blueMed,  fg: C.ice },
      { id: 'settings',    icon: Settings,      label: 'Settings',   action: 'nav:Account',             bg: C.navy,     fg: C.blueGray2 },
    ]
  },
];

// ── Quick Notes ───────────────────────────────────────────────────────────────
function QuickNotesWidget({ onClose }) {
  const [note, setNote] = useState(() => localStorage.getItem('sidebar_quick_note') || '');

  const save = (v) => {
    setNote(v);
    localStorage.setItem('sidebar_quick_note', v);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="mx-3 mb-2 rounded-xl p-3" style={{background:`${C.darkSteel}99`, border:`1px solid ${C.steel}40`}}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{color:C.cyan}}>📝 Quick Notes</span>
        <button onClick={onClose} className="text-xs" style={{color:C.blueGray}}>✕</button>
      </div>
      <textarea
        value={note}
        onChange={e => save(e.target.value)}
        placeholder="Jot something down..."
        rows={4}
        className="w-full rounded-lg p-2 text-xs resize-none focus:outline-none"
        style={{background:`${C.navy}80`, border:`1px solid ${C.steel}30`, color:C.ice, '::placeholder':{color:C.blueGray}}}
      />
      <p className="text-[10px] mt-1" style={{color:`${C.blueGray2}80`}}>Auto-saved locally</p>
    </motion.div>
  );
}

// ── Weather Widget ────────────────────────────────────────────────────────────
function WeatherWidget({ settings }) {
  const city = settings?.location_city || 'London';
  const { data: weather, isLoading } = useQuery({
    queryKey: ['sidebar_weather', city],
    queryFn: async () => {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `Current weather in ${city}. Return temp_c (number), condition (short string max 3 words), emoji (1 weather emoji), humidity (number), feels_like_c (number).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            temp_c: { type: 'number' },
            condition: { type: 'string' },
            emoji: { type: 'string' },
            humidity: { type: 'number' },
            feels_like_c: { type: 'number' },
          }
        }
      });
      return res;
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  return (
    <div className="mx-3 mb-2 rounded-xl p-3" style={{background:`${C.darkSteel}80`, border:`1px solid ${C.steel}30`}}>
      <div className="flex items-center gap-1 mb-1">
        <CloudSun className="w-3 h-3" style={{color:C.sky}} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{color:C.sky}}>Weather · {city}</span>
      </div>
      {isLoading ? (
        <div className="flex gap-1 items-center">
          <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{borderColor:`${C.cyan}30`, borderTopColor:C.cyan}} />
          <span className="text-[10px]" style={{color:`${C.ice}50`}}>Loading...</span>
        </div>
      ) : weather ? (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-black" style={{color:C.ice}}>{weather.temp_c}°</span>
            <p className="text-[10px]" style={{color:`${C.ice}70`}}>{weather.condition}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl">{weather.emoji}</span>
            <p className="text-[10px]" style={{color:`${C.ice}60`}}>💧 {weather.humidity}%</p>
          </div>
        </div>
      ) : (
        <p className="text-[10px]" style={{color:`${C.ice}40`}}>Unavailable</p>
      )}
    </div>
  );
}

// ── Prayer Countdown ──────────────────────────────────────────────────────────
function PrayerCountdown({ settings }) {
  const [nextPrayer, setNextPrayer] = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!settings?.location_city) return;
    const fetchPrayer = async () => {
      try {
        const res = await SDK.integrations.Core.InvokeLLM({
          prompt: `Prayer times today in ${settings.location_city || 'London'} (${new Date().toDateString()}). Give the NEXT upcoming prayer from current time ${new Date().toLocaleTimeString()}. Return: name (string), time_24h (string HH:MM).`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: { name: { type: 'string' }, time_24h: { type: 'string' } }
          }
        });
        if (res?.time_24h) {
          const [h, m] = res.time_24h.split(':').map(Number);
          const target = new Date();
          target.setHours(h, m, 0, 0);
          if (target < new Date()) target.setDate(target.getDate() + 1);
          setNextPrayer({ ...res, target });
        }
      } catch (_) {}
    };
    fetchPrayer();
  }, [settings?.location_city]);

  useEffect(() => {
    if (!nextPrayer?.target) return;
    const tick = setInterval(() => {
      const diff = nextPrayer.target - new Date();
      if (diff <= 0) { setCountdown('Now!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [nextPrayer]);

  if (!settings?.location_city || !nextPrayer) return null;

  return (
    <div className="mx-3 mb-2 rounded-xl px-3 py-2 flex items-center justify-between" style={{background:`${C.tealDark}60`, border:`1px solid ${C.cyan}30`}}>
      <div className="flex items-center gap-1.5">
        <Moon className="w-3 h-3" style={{color:C.cyan}} />
        <span className="text-[10px] font-bold" style={{color:C.lightBlue}}>{nextPrayer.name}</span>
      </div>
      <span className="text-[10px] font-mono font-bold" style={{color:C.ice}}>{countdown || nextPrayer.time_24h}</span>
    </div>
  );
}

// ── Main SidebarTools ─────────────────────────────────────────────────────────
export default function SidebarTools({ isIslamicEdition, settings, currentPageName, onOpenSearch, onOpenHalal, onOpenPlanner, onOpenMeeting }) {
  const [openWidget, setOpenWidget] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const navigate = useNavigate();

  const toggle = (id) => setOpenWidget(w => w === id ? null : id);

  const handleTool = (action) => {
    const [type, payload] = action.split(':');
    if (type === 'nav') {
      navigate(createPageUrl(payload));
    } else if (type === 'event') {
      switch (payload) {
        case 'open_super_agent':
          window.dispatchEvent(new CustomEvent('open_super_agent'));
          break;
        case 'add_event':
          window.dispatchEvent(new CustomEvent('open_event_form'));
          break;
        case 'open_meeting':
          onOpenMeeting?.();
          window.dispatchEvent(new CustomEvent('open_meeting_scheduler'));
          break;
        case 'open_quick_notes':
          toggle('notes');
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="pt-2 pb-1" style={{borderTop:`1px solid ${C.steel}25`}}>
      {/* Section label */}
      <div className="px-3 mb-2 flex items-center gap-2">
        <div className="h-px flex-1" style={{background:`linear-gradient(90deg, transparent, ${C.cyan}30, transparent)`}} />
        <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{color:`${C.cyan}70`}}>Tools</span>
        <div className="h-px flex-1" style={{background:`linear-gradient(90deg, transparent, ${C.cyan}30, transparent)`}} />
      </div>

      {/* Prayer countdown (Islamic only) */}
      {isIslamicEdition && <PrayerCountdown settings={settings} />}

      {/* Notes widget */}
      <AnimatePresence>
        {openWidget === 'notes' && <QuickNotesWidget onClose={() => setOpenWidget(null)} />}
      </AnimatePresence>

      {/* Weather toggle */}
      <button onClick={() => setShowWeather(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group mb-1 hover:bg-white/5">
        <CloudSun className="w-3.5 h-3.5" style={{color:`${C.sky}80`}} />
        <span className="text-[11px] font-medium flex-1" style={{color:`${C.ice}60`}}>Weather</span>
        {showWeather
          ? <ChevronUp className="w-3 h-3" style={{color:`${C.ice}30`}} />
          : <ChevronDown className="w-3 h-3" style={{color:`${C.ice}30`}} />}
      </button>
      <AnimatePresence>
        {showWeather && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <WeatherWidget settings={settings} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool groups */}
      {TOOL_GROUPS.map(group => (
        <div key={group.label} className="mb-3">
          <p className="px-3 text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{color:`${C.ice}30`}}>{group.label}</p>
          <div className="grid grid-cols-3 gap-1 px-2">
            {group.tools.map(tool => {
              const Icon = tool.icon;
              const isActive = tool.action.startsWith('nav:') && currentPageName === tool.action.split(':')[1];
              return (
                <button key={tool.id} onClick={() => handleTool(tool.action)}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all text-center"
                  style={{
                    background: isActive ? `${tool.bg}dd` : `${tool.bg}55`,
                    color: tool.fg,
                    outline: isActive ? `1px solid ${C.cyan}50` : 'none',
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold leading-tight">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}