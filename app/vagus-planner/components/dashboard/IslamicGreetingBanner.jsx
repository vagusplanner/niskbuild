import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Sparkles, ExternalLink, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const ISLAMIC_EVENTS = [
  {
    name: 'Ramadan',
    greeting: 'Ramadan Mubarak! 🌙',
    subtext: 'May this blessed month bring you peace, forgiveness, and spiritual growth.',
    dua: 'اللَّهُمَّ بَلِّغْنَا رَمَضَانَ\n"O Allah, let us reach Ramadan (and accept it from us)."',
    color: 'from-emerald-600 to-teal-700',
    sparkle: true,
    showCalendarLink: true,
    showTodoLink: true,
    check: (hijriMonth, hijriDay) => hijriMonth === 9 && hijriDay === 1,
  },
  {
    name: 'Eid al-Fitr',
    greeting: 'Eid al-Fitr Mubarak! 🎉',
    subtext: 'Taqabbalallahu minnaa wa minkum — May Allah accept from us and from you.',
    dua: 'تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ\n"May Allah accept (good deeds) from us and from you."',
    color: 'from-amber-500 to-orange-600',
    sparkle: true,
    showCalendarLink: true,
    showTodoLink: true,
    showZakatFitr: true,
    check: (hijriMonth, hijriDay) => hijriMonth === 10 && hijriDay <= 3,
  },
  {
    name: 'Eid al-Adha',
    greeting: 'Eid al-Adha Mubarak! 🐑',
    subtext: 'May Allah accept your sacrifice and grant you His mercy.',
    dua: 'تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ\n"May Allah accept (good deeds) from us and from you."',
    color: 'from-rose-500 to-pink-600',
    sparkle: true,
    showCalendarLink: true,
    showTodoLink: true,
    check: (hijriMonth, hijriDay) => hijriMonth === 12 && hijriDay >= 10 && hijriDay <= 13,
  },
  {
    name: 'Dhul Hijjah',
    greeting: 'Blessed Days of Dhul Hijjah! 🕋',
    subtext: 'The best ten days of the year — increase your worship and remembrance of Allah.',
    dua: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ\n"Glory be to Allah and His praise; glory be to Allah, the Magnificent."',
    color: 'from-purple-600 to-indigo-700',
    check: (hijriMonth, hijriDay) => hijriMonth === 12 && hijriDay <= 9,
  },
  {
    name: 'Muharram / Islamic New Year',
    greeting: 'Islamic New Year Mubarak! 🌟',
    subtext: 'May this new Hijri year bring you blessings, growth, and closeness to Allah.',
    dua: 'اللَّهُمَّ أَدْخِلْهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ\n"O Allah, bring it upon us with security and faith."',
    color: 'from-cyan-600 to-blue-700',
    check: (hijriMonth, hijriDay) => hijriMonth === 1 && hijriDay <= 3,
  },
  {
    name: 'Ashura',
    greeting: 'Day of Ashura 🤲',
    subtext: 'A blessed day of fasting — may Allah forgive our sins of the past year.',
    dua: 'اللَّهُمَّ اغْفِرْ لِي ذُنُوبِي وَوَسِّعْ لِي فِي دَارِي\n"O Allah, forgive my sins and grant me spaciousness in my home."',
    color: 'from-slate-600 to-slate-700',
    check: (hijriMonth, hijriDay) => hijriMonth === 1 && hijriDay === 10,
  },
  {
    name: "Mawlid an-Nabi",
    greeting: "Mawlid an-Nabi Mubarak! ﷺ",
    subtext: "May the blessings of the Prophet ﷺ light your path today and always.",
    dua: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ\n"O Allah, send blessings upon Muhammad and the family of Muhammad."',
    color: 'from-green-600 to-emerald-700',
    check: (hijriMonth, hijriDay) => hijriMonth === 3 && hijriDay === 12,
  },
  {
    name: "Laylat al-Qadr",
    greeting: "Laylat al-Qadr Mubarak! ✨",
    subtext: "Better than a thousand months — may your worship be accepted tonight.",
    dua: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي\n"O Allah, You are pardoning and You love to pardon, so pardon me."',
    color: 'from-violet-600 to-purple-700',
    check: (hijriMonth, hijriDay) => hijriMonth === 9 && [21, 23, 25, 27, 29].includes(hijriDay),
  },
];

// Fetch accurate Hijri date from AlAdhan API (avoids browser locale inaccuracy)
async function getAccurateHijriInfo() {
  try {
    const today = new Date();
    const ts = Math.floor(today.getTime() / 1000);
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const h = data.data.hijri;
    return { month: parseInt(h.month.number), day: parseInt(h.day), year: parseInt(h.year) };
  } catch {
    // Fallback to browser Intl
    try {
      const formatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic', { month: 'numeric', day: 'numeric' });
      const parts = formatter.formatToParts(new Date());
      return {
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
        year: 0
      };
    } catch { return null; }
  }
}

// Sparkle particles component
function SparkleEffect() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    size: Math.random() * 6 + 4,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute text-yellow-200"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: [0, 180, 360] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}

export default function IslamicGreetingBanner() {
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [addingToTodo, setAddingToTodo] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [todoAdded, setTodoAdded] = useState(false);

  useEffect(() => {
    getAccurateHijriInfo().then(hijri => {
      if (!hijri) return;

      const matched = ISLAMIC_EVENTS.find(e => e.check(hijri.month, hijri.day));
      if (!matched) return;

      // Dismiss key is per event name + Hijri year — so dismissing once covers the whole multi-day event
      const dismissKey = `islamic_banner_${matched.name.replace(/\s/g, '_')}_${hijri.year}`;
      if (localStorage.getItem(dismissKey)) return;

      setEvent(matched);
      setVisible(true);
      if (!matched.sparkle) {
        const timer = setTimeout(() => setVisible(false), 8000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const addToCalendar = async () => {
    if (!event || calendarAdded) return;
    setAddingToCalendar(true);
    try {
      const today = new Date();
      await base44.entities.Event.create({
        title: `🌙 ${event.name}`,
        start_date: `${format(today, 'yyyy-MM-dd')}T00:00:00.000Z`,
        end_date: `${format(today, 'yyyy-MM-dd')}T23:59:59.000Z`,
        is_all_day: true,
        category: 'holiday',
        notes: event.subtext,
      });
      setCalendarAdded(true);
    } catch {}
    setAddingToCalendar(false);
  };

  const addToTodo = async () => {
    if (!event || todoAdded) return;
    setAddingToTodo(true);
    try {
      const labels = {
        'Ramadan': 'Celebrate & observe Ramadan 🌙',
        'Eid al-Fitr': 'Celebrate Eid al-Fitr 🎉 — Eid prayer, family, gifts',
        'Eid al-Adha': 'Celebrate Eid al-Adha 🐑 — Eid prayer, Qurbani, family',
      };
      await base44.entities.Task.create({
        title: labels[event.name] || `Celebrate ${event.name}`,
        priority: 'high',
        status: 'todo',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'personal',
        notes: event.subtext,
      });
      setTodoAdded(true);
    } catch {}
    setAddingToTodo(false);
  };

  const dismiss = async () => {
    setVisible(false);
    if (!event) return;
    const hijri = await getAccurateHijriInfo();
    const year = hijri?.year || new Date().getFullYear();
    const dismissKey = `islamic_banner_${event.name.replace(/\s/g, '_')}_${year}`;
    localStorage.setItem(dismissKey, '1');
  };

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className={`relative mb-6 rounded-2xl bg-gradient-to-r ${event.color} text-white shadow-xl overflow-hidden`}
        >
          {/* Sparkle effect for Eid & Ramadan */}
          {event.sparkle && <SparkleEffect />}

          {/* decorative stars */}
          <Star className="absolute top-3 right-16 w-4 h-4 text-white/20" />
          <Star className="absolute bottom-3 left-10 w-3 h-3 text-white/15" />
          <Star className="absolute top-6 left-1/3 w-2 h-2 text-white/20" />

          <div className="px-5 py-4 pr-12">
            <p className="text-lg sm:text-xl font-bold leading-tight flex items-center gap-2">
              {event.greeting}
              {event.sparkle && (
                <motion.span animate={{ rotate: [0, 20, -20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Sparkles className="w-5 h-5 text-yellow-200" />
                </motion.span>
              )}
            </p>
            <p className="text-sm text-white/90 mt-0.5">{event.subtext}</p>

            <div className="mt-3 bg-white/15 rounded-xl px-4 py-3">
              {event.dua.split('\n').map((line, i) => (
                <p
                  key={i}
                  className={i === 0 ? 'text-base font-semibold leading-relaxed text-right' : 'text-xs text-white/80 mt-1 italic'}
                  dir={i === 0 ? 'rtl' : 'ltr'}
                  lang={i === 0 ? 'ar' : undefined}
                  style={i === 0 ? { fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2' } : undefined}
                >
                  {line}
                </p>
              ))}
            </div>

            {/* Zakat al-Fitr reminder — only on Eid al-Fitr */}
            {event.showZakatFitr && (
              <div className="mt-3 bg-white/20 border border-white/30 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <Bell className="w-4 h-4 text-yellow-200 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">⚖️ Zakat al-Fitr Reminder</p>
                    <p className="text-xs text-white/90 mt-0.5">
                      Must be paid <span className="font-bold">before the Eid prayer</span>. 
                      In the UK, the amount is typically <span className="font-bold">£7 per person</span> — check with your local Islamic centre or mosque.
                    </p>
                    <Link
                      to={`${createPageUrl('Finance')}?tab=zakat`}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-bold bg-white/25 hover:bg-white/35 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Go to Zakat Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar & Todo quick-add */}
            {(event.showCalendarLink || event.showTodoLink) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.showCalendarLink && (
                  <button
                    onClick={addToCalendar}
                    disabled={addingToCalendar || calendarAdded}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {calendarAdded ? '✓ Added to Calendar' : addingToCalendar ? 'Adding…' : '📅 Mark as Busy Day'}
                  </button>
                )}
                {event.showTodoLink && (
                  <button
                    onClick={addToTodo}
                    disabled={addingToTodo || todoAdded}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {todoAdded ? '✓ Added to Tasks' : addingToTodo ? 'Adding…' : '✅ Add to To-Do'}
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}