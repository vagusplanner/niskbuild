/**
 * GeofencedDuaSuggester — detects the user's location and surfaces
 * context-appropriate duas for key Hajj/Umrah sites via geofencing.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, RefreshCw, BookOpen, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Hajj sacred sites with geofence radius (km) and specific duas
const SACRED_SITES = [
  {
    id: 'kaaba',
    name: "Al-Masjid al-Haram / Kaaba",
    arabic: "المسجد الحرام",
    lat: 21.4225, lng: 39.8262, radius: 0.5,
    color: 'from-amber-500 to-yellow-600',
    emoji: '🕋',
    duas: [
      {
        occasion: "Upon first seeing the Kaaba",
        arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، فَحَيِّنَا رَبَّنَا بِالسَّلَامِ",
        transliteration: "Allahumma anta's-salamu wa minka's-salamu, fa-hayyina rabbana bi's-salam",
        translation: "O Allah, You are Peace and from You comes peace. Greet us, our Lord, with peace.",
      },
      {
        occasion: "Beginning Tawaf",
        arabic: "بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ إِيمَانًا بِكَ وَتَصْدِيقًا بِكِتَابِكَ",
        transliteration: "Bismillahi wallahu akbar, Allahumma imanan bika wa tasdiqan bikitabika",
        translation: "In the name of Allah, Allah is the Greatest. O Allah, out of faith in You and belief in Your Book.",
      }
    ]
  },
  {
    id: 'arafat',
    name: "Arafat (Jabal al-Rahmah)",
    arabic: "عرفات",
    lat: 21.3546, lng: 39.9840, radius: 3.0,
    color: 'from-rose-500 to-pink-600',
    emoji: '⛰️',
    duas: [
      {
        occasion: "Standing at Arafat (Wuquf)",
        arabic: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        transliteration: "La ilaha illallahu wahdahu la sharika lahu, lahul mulku wa lahul hamdu wa huwa ala kulli shay'in qadir",
        translation: "There is no god but Allah alone, with no partner. To Him belongs all sovereignty and praise, and He is over all things competent.",
      },
      {
        occasion: "Dua of Arafat",
        arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
        transliteration: "Allahumma innaka 'afuwwun karimun tuhibbul-'afwa fa'fu 'anni",
        translation: "O Allah, You are Forgiving and Generous. You love forgiveness, so forgive me.",
      }
    ]
  },
  {
    id: 'muzdalifah',
    name: "Muzdalifah",
    arabic: "مزدلفة",
    lat: 21.3831, lng: 39.9361, radius: 2.0,
    color: 'from-indigo-500 to-violet-600',
    emoji: '🌙',
    duas: [
      {
        occasion: "Arriving at Muzdalifah",
        arabic: "اللَّهُمَّ إِنَّ هَذِهِ مُزْدَلِفَةُ، جُمِعَتْ فِيهَا أَلْسِنَةٌ مُخْتَلِفَةٌ، تَسْأَلُكَ حَوَائِجَ مُتَنَوِّعَةً",
        transliteration: "Allahumma inna hadhihi Muzdalifah, jumi'at fiha alsinah mukhtalifah, tas'aluka hawa'ij mutanawwi'ah",
        translation: "O Allah, this is Muzdalifah. In it, tongues of different languages gather, asking You for various needs.",
      }
    ]
  },
  {
    id: 'mina',
    name: "Mina",
    arabic: "منى",
    lat: 21.4130, lng: 39.8932, radius: 2.5,
    color: 'from-teal-500 to-emerald-600',
    emoji: '⛺',
    duas: [
      {
        occasion: "At Jamarat (stoning)",
        arabic: "بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ",
        transliteration: "Bismillahi wallahu akbar, raghman lish-shaytani wa hizbihi",
        translation: "In the name of Allah, Allah is the Greatest. In humiliation of Shaytan and his party.",
      },
      {
        occasion: "During Eid Day in Mina",
        arabic: "اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ",
        transliteration: "Allahu akbar, Allahu akbar, la ilaha illallahu wallahu akbar, Allahu akbar, wa lillahil hamd",
        translation: "Allah is the Greatest, Allah is the Greatest. There is no god but Allah and Allah is the Greatest. Allah is the Greatest and to Allah belongs all praise.",
      }
    ]
  },
  {
    id: 'safa_marwa',
    name: "Safa & Marwah",
    arabic: "الصفا والمروة",
    lat: 21.4237, lng: 39.8270, radius: 0.3,
    color: 'from-cyan-500 to-blue-600',
    emoji: '🏃',
    duas: [
      {
        occasion: "At Safa (beginning Sa'i)",
        arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ، أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ",
        transliteration: "Innas-safa wal-marwata min sha'a'irillah. Abda'u bima bada'allahu bihi",
        translation: "Indeed Safa and Marwah are among the signs of Allah. I begin with what Allah began with.",
      }
    ]
  },
  {
    id: 'zamzam',
    name: "Zamzam Well",
    arabic: "بئر زمزم",
    lat: 21.4228, lng: 39.8262, radius: 0.2,
    color: 'from-blue-500 to-sky-600',
    emoji: '💧',
    duas: [
      {
        occasion: "Drinking Zamzam water",
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ",
        transliteration: "Allahumma inni as'aluka 'ilman nafi'an wa rizqan wasi'an wa shifa'an min kulli da'",
        translation: "O Allah, I ask You for beneficial knowledge, abundant provision, and cure from every disease.",
      }
    ]
  }
];

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function DuaCard({ dua, siteColor }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`${dua.arabic}\n\n${dua.transliteration}\n\n${dua.translation}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Dua copied');
  };
  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{dua.occasion}</p>
        <button onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      </div>
      <p className="text-xl font-bold text-right text-slate-800 dark:text-slate-100 leading-relaxed" dir="rtl">{dua.arabic}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 italic">{dua.transliteration}</p>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-2">{dua.translation}</p>
    </div>
  );
}

export default function GeofencedDuaSuggester() {
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [nearbySite, setNearbySite] = useState(null);
  const [manualSite, setManualSite] = useState(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported on this device');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocating(false);
        // Find nearest site within geofence
        const found = SACRED_SITES.find(s => distanceKm(latitude, longitude, s.lat, s.lng) <= s.radius);
        setNearbySite(found || null);
        if (found) {
          toast.success(`📍 Detected: ${found.name} — duas loaded!`);
        } else {
          toast('No sacred site detected nearby. Select manually below.');
        }
      },
      () => {
        setLocating(false);
        setLocError('Could not get location. Select a site manually below.');
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const activeSite = manualSite || nearbySite;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 shadow-md">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-emerald-200" />
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Location-Based Duas</span>
            </div>
            <h3 className="text-lg font-black text-white">Geofenced Dua Guide</h3>
            <p className="text-xs text-emerald-200 mt-0.5">Context-aware supplications for each sacred site</p>
          </div>
          <Button onClick={detectLocation} disabled={locating}
            className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2 backdrop-blur-sm">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {locating ? 'Locating…' : 'Detect'}
          </Button>
        </div>
        {locError && <p className="relative z-10 text-xs text-red-200 mt-2">{locError}</p>}
        {location && !nearbySite && !manualSite && (
          <p className="relative z-10 text-xs text-emerald-200 mt-1">📍 Location obtained — select a site below or move closer to a sacred site.</p>
        )}
        {nearbySite && (
          <div className="relative z-10 mt-2 flex items-center gap-2">
            <span className="text-lg">{nearbySite.emoji}</span>
            <span className="text-sm font-bold text-white">You are near: {nearbySite.name}</span>
            <span className="text-xs text-emerald-200" dir="rtl">{nearbySite.arabic}</span>
          </div>
        )}
      </div>

      {/* Manual site picker */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select sacred site</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SACRED_SITES.map(site => (
            <button key={site.id} onClick={() => setManualSite(manualSite?.id === site.id ? null : site)}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-sm font-medium',
                activeSite?.id === site.id
                  ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-teal-300'
              )}>
              <span className="text-base">{site.emoji}</span>
              <span className="truncate text-xs">{site.name.split('/')[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duas for active site */}
      <AnimatePresence mode="wait">
        {activeSite ? (
          <motion.div key={activeSite.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r ${activeSite.color} shadow-md`}>
              <span className="text-2xl">{activeSite.emoji}</span>
              <div>
                <p className="font-black text-white text-sm">{activeSite.name}</p>
                <p className="text-xs text-white/70" dir="rtl">{activeSite.arabic}</p>
              </div>
              <BookOpen className="w-4 h-4 text-white/60 ml-auto" />
            </div>
            {activeSite.duas.map((dua, i) => <DuaCard key={i} dua={dua} siteColor={activeSite.color} />)}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-4xl mb-3">🕌</span>
            <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">Tap "Detect" or select a site above</p>
            <p className="text-xs text-slate-400 mt-1">Relevant duas will appear for your current location</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}