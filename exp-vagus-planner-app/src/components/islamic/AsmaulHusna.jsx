import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, Heart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const ASMAUL_HUSNA = [
  { number: 1, arabic: 'الرَّحْمَنُ', transliteration: 'Ar-Rahman', meaning: 'The Most Gracious', reflection: 'Allah\'s mercy encompasses all creation. How can you be more merciful today?' },
  { number: 2, arabic: 'الرَّحِيمُ', transliteration: 'Ar-Raheem', meaning: 'The Most Merciful', reflection: 'His mercy is specific and personal. Feel His mercy in your life right now.' },
  { number: 3, arabic: 'الْمَلِكُ', transliteration: 'Al-Malik', meaning: 'The King', reflection: 'All dominion belongs to Allah. How does remembering this bring you peace?' },
  { number: 4, arabic: 'الْقُدُّوسُ', transliteration: 'Al-Quddus', meaning: 'The Most Holy', reflection: 'He is pure and perfect. Strive for purity in your intentions today.' },
  { number: 5, arabic: 'السَّلَامُ', transliteration: 'As-Salam', meaning: 'The Source of Peace', reflection: 'True peace comes only from Allah. Turn to Him in your moments of anxiety.' },
  { number: 6, arabic: 'الْمُؤْمِنُ', transliteration: 'Al-Mumin', meaning: 'The Guardian of Faith', reflection: 'He is the giver of security and faith. Trust in His protection completely.' },
  { number: 7, arabic: 'الْمُهَيْمِنُ', transliteration: 'Al-Muhaymin', meaning: 'The Overseer', reflection: 'He watches over all things. Nothing escapes His awareness and care.' },
  { number: 8, arabic: 'الْعَزِيزُ', transliteration: 'Al-Aziz', meaning: 'The Almighty', reflection: 'His might is absolute. Seek strength through your connection to Him.' },
  { number: 9, arabic: 'الْجَبَّارُ', transliteration: 'Al-Jabbar', meaning: 'The Compeller', reflection: 'He repairs what is broken. Bring Him your brokenness and He will heal it.' },
  { number: 10, arabic: 'الْمُتَكَبِّرُ', transliteration: 'Al-Mutakabbir', meaning: 'The Supreme', reflection: 'True greatness belongs only to Allah. Let go of pride and ego today.' },
  { number: 11, arabic: 'الْخَالِقُ', transliteration: 'Al-Khaliq', meaning: 'The Creator', reflection: 'He created you with purpose. What is your purpose fulfilling today?' },
  { number: 12, arabic: 'الْبَارِئُ', transliteration: 'Al-Bari', meaning: 'The Originator', reflection: 'He shaped you uniquely. Embrace your unique gifts as His creation.' },
  { number: 13, arabic: 'الْمُصَوِّرُ', transliteration: 'Al-Musawwir', meaning: 'The Fashioner', reflection: 'He gave you your form. Be grateful for the way He made you.' },
  { number: 14, arabic: 'الْغَفَّارُ', transliteration: 'Al-Ghaffar', meaning: 'The Repeatedly Forgiving', reflection: 'He forgives again and again. Never lose hope in His forgiveness.' },
  { number: 15, arabic: 'الْقَهَّارُ', transliteration: 'Al-Qahhar', meaning: 'The Subduer', reflection: 'All things are under His power. Trust He is in control of what worries you.' },
  { number: 16, arabic: 'الْوَهَّابُ', transliteration: 'Al-Wahhab', meaning: 'The Bestower', reflection: 'He gives without measure. Ask Him freely and generously.' },
  { number: 17, arabic: 'الرَّزَّاقُ', transliteration: 'Ar-Razzaq', meaning: 'The Provider', reflection: 'He guarantees your provision. Release your anxiety about sustenance.' },
  { number: 18, arabic: 'الْفَتَّاحُ', transliteration: 'Al-Fattah', meaning: 'The Opener', reflection: 'He opens doors no one can close. What door are you asking Him to open?' },
  { number: 19, arabic: 'اَلْعَلِيمُ', transliteration: 'Al-Alim', meaning: 'The All-Knowing', reflection: 'He knows what you hide and what you show. Be authentic before Him.' },
  { number: 20, arabic: 'الْقَابِضُ', transliteration: 'Al-Qabid', meaning: 'The Constrictor', reflection: 'He withholds and grants. Trust His wisdom in times of difficulty.' },
  { number: 21, arabic: 'الْبَاسِطُ', transliteration: 'Al-Basit', meaning: 'The Expander', reflection: 'He expands the heart and provision. Ask Him to expand your heart today.' },
  { number: 22, arabic: 'الْخَافِضُ', transliteration: 'Al-Khafid', meaning: 'The Abaser', reflection: 'He humbles the arrogant. Stay humble so He lifts you instead.' },
  { number: 23, arabic: 'الرَّافِعُ', transliteration: 'Ar-Rafi', meaning: 'The Exalter', reflection: 'He raises those who are humble and sincere. Seek His elevation.' },
  { number: 24, arabic: 'الْمُعِزُّ', transliteration: 'Al-Muizz', meaning: 'The Bestower of Honour', reflection: 'True honour comes from Allah alone. Seek His honour, not people\'s.' },
  { number: 25, arabic: 'الْمُذِلُّ', transliteration: 'Al-Mudhill', meaning: 'The Humiliator', reflection: 'He humbles who He wills. Seek His protection from humiliation.' },
  { number: 26, arabic: 'السَّمِيعُ', transliteration: 'As-Sami', meaning: 'The All-Hearing', reflection: 'He hears every whisper and every dua. Speak to Him freely.' },
  { number: 27, arabic: 'الْبَصِيرُ', transliteration: 'Al-Basir', meaning: 'The All-Seeing', reflection: 'He sees your struggles unseen by others. Find comfort in being truly seen.' },
  { number: 28, arabic: 'الْحَكَمُ', transliteration: 'Al-Hakam', meaning: 'The Judge', reflection: 'Ultimate justice belongs to Him. Find peace when justice seems delayed.' },
  { number: 29, arabic: 'الْعَدْلُ', transliteration: 'Al-Adl', meaning: 'The Just', reflection: 'Perfect justice is His attribute. Commit to justice in your own dealings.' },
  { number: 30, arabic: 'اللَّطِيفُ', transliteration: 'Al-Latif', meaning: 'The Subtle', reflection: 'He reaches you in subtle, gentle ways. Notice His kindness today.' },
  { number: 31, arabic: 'الْخَبِيرُ', transliteration: 'Al-Khabir', meaning: 'The Acquainted', reflection: 'He is fully aware of all details. Nothing about you is hidden from Him.' },
  { number: 32, arabic: 'الْحَلِيمُ', transliteration: 'Al-Halim', meaning: 'The Forbearing', reflection: 'He does not rush to punish. His patience with us is a sign of His mercy.' },
  { number: 33, arabic: 'الْعَظِيمُ', transliteration: 'Al-Azim', meaning: 'The Magnificent', reflection: 'His greatness is beyond comprehension. Let this awe quiet your worries.' },
  { number: 34, arabic: 'الْغَفُورُ', transliteration: 'Al-Ghafur', meaning: 'The Forgiving', reflection: 'He covers your sins and imperfections. Return to Him with confidence.' },
  { number: 35, arabic: 'الشَّكُورُ', transliteration: 'Ash-Shakur', meaning: 'The Appreciative', reflection: 'He rewards even the smallest good deed. No effort for Him goes unnoticed.' },
  { number: 36, arabic: 'الْعَلِيُّ', transliteration: 'Al-Ali', meaning: 'The Most High', reflection: 'He is above all. Lift your gaze above your problems to Him.' },
  { number: 37, arabic: 'الْكَبِيرُ', transliteration: 'Al-Kabir', meaning: 'The Greatest', reflection: 'No problem is too big for Him. Bring your greatest worries to Him.' },
  { number: 38, arabic: 'الْحَفِيظُ', transliteration: 'Al-Hafiz', meaning: 'The Preserver', reflection: 'He protects and preserves. Trust Him with what you love most.' },
  { number: 39, arabic: 'الْمُقِيتُ', transliteration: 'Al-Muqit', meaning: 'The Sustainer', reflection: 'He nourishes every soul. Trust that your needs will be met.' },
  { number: 40, arabic: 'الْحَسِيبُ', transliteration: 'Al-Hasib', meaning: 'The Accountant', reflection: 'He takes perfect account of everything. Live with accountability.' },
  { number: 41, arabic: 'الْجَلِيلُ', transliteration: 'Al-Jalil', meaning: 'The Majestic', reflection: 'His majesty is awe-inspiring. Let this majesty humble and elevate you.' },
  { number: 42, arabic: 'الْكَرِيمُ', transliteration: 'Al-Karim', meaning: 'The Generous', reflection: 'His generosity has no end. Be generous as a reflection of His attribute.' },
  { number: 43, arabic: 'الرَّقِيبُ', transliteration: 'Ar-Raqib', meaning: 'The Watchful', reflection: 'He watches over you always. Feel safe under His watchful care.' },
  { number: 44, arabic: 'الْمُجِيبُ', transliteration: 'Al-Mujib', meaning: 'The Responsive', reflection: 'He responds to every sincere call. Make dua with full confidence.' },
  { number: 45, arabic: 'الْوَاسِعُ', transliteration: 'Al-Wasi', meaning: 'The All-Encompassing', reflection: 'His mercy and knowledge encompass everything. Nothing is outside His reach.' },
  { number: 46, arabic: 'الْحَكِيمُ', transliteration: 'Al-Hakim', meaning: 'The Wise', reflection: 'His wisdom is in every decree. Trust the wisdom behind what you don\'t understand.' },
  { number: 47, arabic: 'الْوَدُودُ', transliteration: 'Al-Wadud', meaning: 'The Loving', reflection: 'He loves His servants with a love beyond measure. Feel loved today.' },
  { number: 48, arabic: 'الْمَجِيدُ', transliteration: 'Al-Majid', meaning: 'The Glorious', reflection: 'He is infinitely glorious. Glorify Him and let that glory enter your heart.' },
  { number: 49, arabic: 'الْبَاعِثُ', transliteration: 'Al-Baith', meaning: 'The Resurrector', reflection: 'He will raise all from the dead. Live with awareness of what comes after.' },
  { number: 50, arabic: 'الشَّهِيدُ', transliteration: 'Ash-Shahid', meaning: 'The Witness', reflection: 'He witnesses all. Your sincerity matters more than how things appear.' },
  { number: 51, arabic: 'الْحَقُّ', transliteration: 'Al-Haqq', meaning: 'The Truth', reflection: 'He is the ultimate reality. Align your life with truth and you align with Him.' },
  { number: 52, arabic: 'الْوَكِيلُ', transliteration: 'Al-Wakil', meaning: 'The Trustee', reflection: 'Make Him your sole trustee. Put your full reliance in Him.' },
  { number: 53, arabic: 'الْقَوِيُّ', transliteration: 'Al-Qawi', meaning: 'The Strong', reflection: 'His strength is limitless. In your weakness, His strength is made perfect.' },
  { number: 54, arabic: 'الْمَتِينُ', transliteration: 'Al-Matin', meaning: 'The Firm', reflection: 'He is unshakeable. Rest in the firmness of His promises.' },
  { number: 55, arabic: 'الْوَلِيُّ', transliteration: 'Al-Waliy', meaning: 'The Friend', reflection: 'He is the best of friends. Cultivate your friendship with Him through worship.' },
  { number: 56, arabic: 'الْحَمِيدُ', transliteration: 'Al-Hamid', meaning: 'The Praiseworthy', reflection: 'All praise belongs to Him. Begin and end your day praising Him.' },
  { number: 57, arabic: 'الْمُحْصِيُ', transliteration: 'Al-Muhsi', meaning: 'The Counter', reflection: 'He counts every deed. Small consistent actions matter enormously.' },
  { number: 58, arabic: 'الْمُبْدِئُ', transliteration: 'Al-Mubdi', meaning: 'The Originator', reflection: 'He began all things from nothing. Trust Him to begin again after hardship.' },
  { number: 59, arabic: 'الْمُعِيدُ', transliteration: 'Al-Muid', meaning: 'The Restorer', reflection: 'He restores and returns. Trust Him to restore what has been lost.' },
  { number: 60, arabic: 'الْمُحْيِي', transliteration: 'Al-Muhyi', meaning: 'The Giver of Life', reflection: 'He gives life to the dead. Ask Him to give life to your dead heart.' },
  { number: 61, arabic: 'اَلْمُمِيتُ', transliteration: 'Al-Mumit', meaning: 'The Taker of Life', reflection: 'Death is His domain. Live each day as if it could be your last.' },
  { number: 62, arabic: 'الْحَيُّ', transliteration: 'Al-Hayy', meaning: 'The Ever-Living', reflection: 'He never sleeps or tires. Call on Him at any hour, any moment.' },
  { number: 63, arabic: 'الْقَيُّومُ', transliteration: 'Al-Qayyum', meaning: 'The Self-Sustaining', reflection: 'He sustains all existence. Rest knowing everything is held by Him.' },
  { number: 64, arabic: 'الْوَاجِدُ', transliteration: 'Al-Wajid', meaning: 'The Finder', reflection: 'He finds and provides what is needed. Trust He knows what you need.' },
  { number: 65, arabic: 'الْمَاجِدُ', transliteration: 'Al-Majid', meaning: 'The Noble', reflection: 'His nobility is infinite. Seek nobility through serving Him.' },
  { number: 66, arabic: 'الْواحِدُ', transliteration: 'Al-Wahid', meaning: 'The One', reflection: 'He alone deserves complete devotion. Simplify your heart for Him.' },
  { number: 67, arabic: 'اَلاحَدُ', transliteration: 'Al-Ahad', meaning: 'The Unique', reflection: 'He is absolutely one with no partner. Let Tawhid permeate everything you do.' },
  { number: 68, arabic: 'الصَّمَدُ', transliteration: 'As-Samad', meaning: 'The Eternal', reflection: 'Everything depends on Him. He depends on nothing. Turn to Him in all needs.' },
  { number: 69, arabic: 'الْقَادِرُ', transliteration: 'Al-Qadir', meaning: 'The Capable', reflection: 'Nothing is impossible for Him. Ask for what seems impossible.' },
  { number: 70, arabic: 'الْمُقْتَدِرُ', transliteration: 'Al-Muqtadir', meaning: 'The All-Powerful', reflection: 'His power is complete and perfect. Place your full trust in His power.' },
  { number: 71, arabic: 'الْمُقَدِّمُ', transliteration: 'Al-Muqaddim', meaning: 'The Expediter', reflection: 'He brings forward what He wills. Trust His perfect timing in your life.' },
  { number: 72, arabic: 'الْمُؤَخِّرُ', transliteration: 'Al-Muakhkhir', meaning: 'The Delayer', reflection: 'He delays what He wills with wisdom. What feels delayed may be a mercy.' },
  { number: 73, arabic: 'الأوَّلُ', transliteration: 'Al-Awwal', meaning: 'The First', reflection: 'He was before all things. Begin everything by turning to Him first.' },
  { number: 74, arabic: 'الآخِرُ', transliteration: 'Al-Akhir', meaning: 'The Last', reflection: 'He will remain after all things. End everything by returning to Him.' },
  { number: 75, arabic: 'الظَّاهِرُ', transliteration: 'Az-Zahir', meaning: 'The Manifest', reflection: 'His signs are everywhere in creation. Open your eyes to see Him.' },
  { number: 76, arabic: 'الْبَاطِنُ', transliteration: 'Al-Batin', meaning: 'The Hidden', reflection: 'He is closer than your jugular vein yet hidden. Seek Him in stillness.' },
  { number: 77, arabic: 'الْوَالِي', transliteration: 'Al-Wali', meaning: 'The Governor', reflection: 'He governs all affairs. Surrender your plans to His governance.' },
  { number: 78, arabic: 'الْمُتَعَالِي', transliteration: 'Al-Mutaali', meaning: 'The Self-Exalted', reflection: 'He is exalted above all human understanding. Accept His mysteries with faith.' },
  { number: 79, arabic: 'الْبَرُّ', transliteration: 'Al-Barr', meaning: 'The Source of Goodness', reflection: 'All goodness flows from Him. Be a channel of His goodness to others.' },
  { number: 80, arabic: 'التَّوَّابُ', transliteration: 'At-Tawwab', meaning: 'The Ever-Returning', reflection: 'He returns to those who return to Him. Make your return to Him today.' },
  { number: 81, arabic: 'الْمُنْتَقِمُ', transliteration: 'Al-Muntaqim', meaning: 'The Avenger', reflection: 'He takes account of injustice. Leave justice to Him and free your heart.' },
  { number: 82, arabic: 'العَفُوُّ', transliteration: 'Al-Afuw', meaning: 'The Pardoner', reflection: 'He doesn\'t just forgive — He erases. Your sins can be completely wiped clean.' },
  { number: 83, arabic: 'الرَّؤُوفُ', transliteration: 'Ar-Rauf', meaning: 'The Compassionate', reflection: 'His compassion is tender and personal. You are never alone in your pain.' },
  { number: 84, arabic: 'مَالِكُ الْمُلْكِ', transliteration: 'Malik-ul-Mulk', meaning: 'Owner of All Sovereignty', reflection: 'All kingdoms are His. What worldly status are you clinging to unnecessarily?' },
  { number: 85, arabic: 'ذُوالْجَلاَلِ وَالإكْرَامِ', transliteration: 'Dhul-Jalali-wal-Ikram', meaning: 'Lord of Majesty and Generosity', reflection: 'He combines might and generosity perfectly. Approach Him with both awe and hope.' },
  { number: 86, arabic: 'الْمُقْسِطُ', transliteration: 'Al-Muqsit', meaning: 'The Equitable', reflection: 'He deals with absolute equity. Commit to fairness in all your relationships.' },
  { number: 87, arabic: 'الْجَامِعُ', transliteration: 'Al-Jami', meaning: 'The Gatherer', reflection: 'He will gather all on the Day of Judgment. Live with that day in mind.' },
  { number: 88, arabic: 'الْغَنِيُّ', transliteration: 'Al-Ghani', meaning: 'The Rich', reflection: 'He needs nothing from us. Our worship is for our own benefit and growth.' },
  { number: 89, arabic: 'الْمُغْنِي', transliteration: 'Al-Mughni', meaning: 'The Enricher', reflection: 'He enriches the soul beyond material wealth. Seek His spiritual richness.' },
  { number: 90, arabic: 'اَلْمَانِعُ', transliteration: 'Al-Mani', meaning: 'The Preventer', reflection: 'What He prevents is protection. Trust when doors close, He is saving you.' },
  { number: 91, arabic: 'الضَّارَّ', transliteration: 'Ad-Darr', meaning: 'The Distresser', reflection: 'Even hardship comes from Him. Find the growth and wisdom within your trials.' },
  { number: 92, arabic: 'النَّافِعُ', transliteration: 'An-Nafi', meaning: 'The Propitious', reflection: 'All benefit comes from Him. Be grateful for every blessing, small and large.' },
  { number: 93, arabic: 'النُّورُ', transliteration: 'An-Nur', meaning: 'The Light', reflection: 'He is the light of the heavens and earth. Let His light guide your decisions.' },
  { number: 94, arabic: 'الْهَادِي', transliteration: 'Al-Hadi', meaning: 'The Guide', reflection: 'He guides whom He wills. Ask Him constantly for guidance in all matters.' },
  { number: 95, arabic: 'الْبَدِيعُ', transliteration: 'Al-Badi', meaning: 'The Incomparable', reflection: 'He creates without precedent or model. Marvel at the originality of His creation.' },
  { number: 96, arabic: 'اَلْبَاقِي', transliteration: 'Al-Baqi', meaning: 'The Everlasting', reflection: 'Only He endures. Invest in what endures — your relationship with Him.' },
  { number: 97, arabic: 'الْوَارِثُ', transliteration: 'Al-Warith', meaning: 'The Inheritor', reflection: 'Everything returns to Him. Hold worldly things lightly.' },
  { number: 98, arabic: 'الرَّشِيدُ', transliteration: 'Ar-Rashid', meaning: 'The Guide to the Right Path', reflection: 'His guidance leads to what is right. Follow His guidance even when it\'s hard.' },
  { number: 99, arabic: 'الصَّبُورُ', transliteration: 'As-Sabur', meaning: 'The Patient', reflection: 'He is infinitely patient with His creation. Cultivate patience as His attribute.' },
];

function getDailyName() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return ASMAUL_HUSNA[dayOfYear % 99];
}

export default function AsmaulHusna({ compact = false }) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return dayOfYear % 99;
  });
  const [aiDua, setAiDua] = useState(null);
  const [loadingDua, setLoadingDua] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const name = ASMAUL_HUSNA[currentIndex];

  const generateDua = async () => {
    setLoadingDua(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Generate a beautiful, heartfelt personal dua (supplication) in English inspired by the name of Allah: "${name.transliteration}" (${name.meaning}). The dua should be personal, emotional, specific, and no longer than 3 sentences. Start with "Ya ${name.transliteration},"`,
      });
      setAiDua(result);
    } catch (_) {}
    setLoadingDua(false);
  };

  const prev = () => setCurrentIndex(i => (i - 1 + 99) % 99);
  const next = () => setCurrentIndex(i => (i + 1) % 99);

  if (compact) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#152244] to-[#2979C5] p-4 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#5BB8F5] uppercase tracking-widest">Today's Name of Allah</span>
          <span className="text-xs text-white/50">#{name.number}/99</span>
        </div>
        <div className="text-center py-2">
          <p className="text-3xl font-bold text-white mb-1" dir="rtl">{name.arabic}</p>
          <p className="text-base font-bold text-[#5BB8F5]">{name.transliteration}</p>
          <p className="text-sm text-white/70">{name.meaning}</p>
        </div>
        <p className="text-xs text-white/60 italic text-center mt-1">{name.reflection}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main name card */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 text-[120px] font-black text-white/5 leading-none select-none" dir="rtl">
          {name.arabic}
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Name #{name.number} of 99</span>
            <button onClick={() => setFavorited(f => !f)} className="p-1">
              <Heart className={`w-5 h-5 ${favorited ? 'fill-white text-white' : 'text-white/60'}`} />
            </button>
          </div>
          <p className="text-5xl font-bold text-center mb-3 leading-tight" dir="rtl">{name.arabic}</p>
          <p className="text-xl font-bold text-center text-amber-100">{name.transliteration}</p>
          <p className="text-base text-center text-amber-200 mt-1">{name.meaning}</p>
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={prev} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all text-sm font-medium">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="text-xs text-slate-400">{currentIndex + 1}/99</span>
        <button onClick={next} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all text-sm font-medium">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Reflection */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">💭 Daily Reflection</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">{name.reflection}</p>
      </div>

      {/* AI Dua generator */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-400">🤲 AI-Generated Dua</p>
          <Button
            size="sm"
            onClick={generateDua}
            disabled={loadingDua}
            className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loadingDua ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {loadingDua ? '' : 'Generate Dua'}
          </Button>
        </div>
        <AnimatePresence>
          {aiDua && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed"
            >
              {aiDua}
            </motion.p>
          )}
        </AnimatePresence>
        {!aiDua && !loadingDua && (
          <p className="text-xs text-purple-500 dark:text-purple-400">Tap to generate a personal dua inspired by this name</p>
        )}
      </div>

      {/* All names grid */}
      <details className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
        <summary className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
          View All 99 Names
        </summary>
        <div className="p-3 grid grid-cols-3 gap-1.5 max-h-80 overflow-y-auto">
          {ASMAUL_HUSNA.map((n, i) => (
            <button
              key={n.number}
              onClick={() => setCurrentIndex(i)}
              className={`p-2 rounded-xl text-center transition-all ${
                i === currentIndex
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300'
              }`}
            >
              <p className="text-[10px] font-bold" dir="rtl">{n.arabic}</p>
              <p className="text-[9px] text-current opacity-70">{n.transliteration}</p>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}