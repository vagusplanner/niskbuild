import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isPageHiddenFromNav } from '@/lib/nav-v1-scope';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
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
// Real Open-Meteo via getWeatherForecast (lat/lon). Not InvokeLLM — the old LLM
// path invented temps and defaulted city to "London" when settings were empty.
function WeatherWidget({ settings }) {
  const savedLat =
    typeof settings?.latitude === 'number'
      ? settings.latitude
      : typeof settings?.lat === 'number'
        ? settings.lat
        : null;
  const savedLon =
    typeof settings?.longitude === 'number'
      ? settings.longitude
      : typeof settings?.lon === 'number'
        ? settings.lon
        : null;

  const [coords, setCoords] = useState(() =>
    savedLat != null && savedLon != null ? { lat: savedLat, lon: savedLon, source: 'settings' } : { lat: null, lon: null, source: null }
  );

  useEffect(() => {
    if (savedLat != null && savedLon != null) {
      setCoords({ lat: savedLat, lon: savedLon, source: 'settings' });
      return;
    }
    if (!navigator.geolocation) {
      setCoords({ lat: 51.5074, lon: -0.1278, source: 'fallback' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'geo',
        }),
      () => setCoords({ lat: 51.5074, lon: -0.1278, source: 'fallback' }),
      { maximumAge: 1000 * 60 * 10, timeout: 8000 }
    );
  }, [savedLat, savedLon]);

  const label =
    [settings?.location_city, settings?.location_country].filter(Boolean).join(', ') ||
    (coords.source === 'fallback' ? 'London' : 'Near you');

  const today = new Date().toISOString().slice(0, 10);
  const { data: weather, isLoading } = useQuery({
    queryKey: ['sidebar_weather', coords.lat, coords.lon, today],
    queryFn: async () => {
      const res = await base44.functions.invoke('getWeatherForecast', {
        latitude: coords.lat,
        longitude: coords.lon,
        date: today,
      });
      return res?.data ?? res;
    },
    enabled: coords.lat != null && coords.lon != null,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const displayTemp =
    weather &&
    typeof weather.temperature_min === 'number' &&
    typeof weather.temperature_max === 'number'
      ? Math.round((weather.temperature_min + weather.temperature_max) / 2)
      : null;

  return (
    <div className="mx-3 mb-2 rounded-xl p-3" style={{background:`${C.darkSteel}80`, border:`1px solid ${C.steel}30`}}>
      <div className="flex items-center gap-1 mb-1">
        <CloudSun className="w-3 h-3" style={{color:C.sky}} />
        <span className="text-[10px] font-bold uppercase tracking-wide truncate" style={{color:C.sky}}>
          Weather · {label}
        </span>
      </div>
      {isLoading || coords.lat == null ? (
        <div className="flex gap-1 items-center">
          <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{borderColor:`${C.cyan}30`, borderTopColor:C.cyan}} />
          <span className="text-[10px]" style={{color:`${C.ice}50`}}>Loading...</span>
        </div>
      ) : weather && displayTemp != null ? (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-black" style={{color:C.ice}}>
              {displayTemp}°{weather.unit || 'C'}
            </span>
            <p className="text-[10px]" style={{color:`${C.ice}70`}}>{weather.description}</p>
            <p className="text-[9px]" style={{color:`${C.ice}45`}}>
              {weather.temperature_min}–{weather.temperature_max}°{weather.unit || 'C'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl">{weather.icon}</span>
            {weather.precipitation_probability > 0 && (
              <p className="text-[10px]" style={{color:`${C.ice}60`}}>
                💧 {weather.precipitation_probability}%
              </p>
            )}
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
        const res = await base44.integrations.Core.InvokeLLM({
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
export default function SidebarTools({ islamicMode, settings, currentPageName, onOpenSearch, onOpenHalal, onOpenPlanner, onOpenMeeting }) {
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
          navigate(`${createPageUrl('Calendar')}?action=new`);
          window.dispatchEvent(new CustomEvent('open_event_form'));
          break;
        case 'open_meeting':
          navigate(`${createPageUrl('Calendar')}?action=schedule-meeting`);
          window.dispatchEvent(new CustomEvent('open_meeting_scheduler'));
          onOpenMeeting?.();
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
      {islamicMode && <PrayerCountdown settings={settings} />}

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
            {group.tools.filter(tool => {
              if (tool.id === 'islam' && !islamicMode) return false;
              if (!tool.action.startsWith('nav:')) return true;
              const page = tool.action.split(':')[1];
              return !isPageHiddenFromNav(page);
            }).map(tool => {
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