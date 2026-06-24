import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X } from 'lucide-react';

const DUA_COLLECTIONS = {
  morning: {
    startHour: 5,  // 5 AM
    endHour: 9,    // 9 AM
    duas: [
      { arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ', english: 'We have entered morning, and sovereignty belongs to Allah, and all praise is for Allah' },
      { arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', english: 'O Allah, by You we enter the morning, by You we enter the evening, by You we live and by You we die, and to You is the resurrection' },
      { arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ', english: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant' }
    ]
  },
  evening: {
    startHour: 17, // 5 PM
    endHour: 21,   // 9 PM
    duas: [
      { arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ', english: 'We have entered the evening, and sovereignty belongs to Allah, and all praise is for Allah' },
      { arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', english: 'O Allah, by You we enter the evening, by You we enter the morning, by You we live, by You we die, and to You is the return' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', english: 'O Allah, I ask You for well-being in this world and the Hereafter' }
    ]
  },
  beforeSleep: {
    startHour: 21, // 9 PM
    endHour: 24,   // midnight
    duas: [
      { arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', english: 'In Your name O Allah, I die and I live' },
      { arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', english: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants' },
      { arabic: 'اللَّهُمَّ بِاسْمِكَ أَحْيَا وَبِاسْمِكَ أَمُوتُ', english: 'O Allah, in Your name I live and in Your name I die' }
    ]
  }
};

export default function DuaCollectionsPopup() {
  const [currentDua, setCurrentDua] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkAndShowDua = () => {
      const hour = new Date().getHours();
      const lastShown = localStorage.getItem('last_dua_shown');
      const today = new Date().toDateString();

      for (const [key, collection] of Object.entries(DUA_COLLECTIONS)) {
        const endHour = collection.endHour === 24 ? 24 : collection.endHour;
        const inRange = hour >= collection.startHour && hour < endHour;
        if (inRange && lastShown !== `${today}-${key}`) {
          setCurrentDua({ key, ...collection });
          setShow(true);
          localStorage.setItem('last_dua_shown', `${today}-${key}`);
          break;
        }
      }
    };

    checkAndShowDua();
    const interval = setInterval(checkAndShowDua, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (!currentDua) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={() => setShow(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-2 sm:inset-4 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-auto z-[201] w-auto md:w-full md:max-w-lg max-h-[90vh] overflow-y-auto safe-area-top safe-area-bottom"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShow(false)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 hover:bg-white/50 rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center pointer-events-auto z-10"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </button>

              <div className="text-center space-y-3 sm:space-y-4">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-emerald-600" />
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                  {currentDua.key === 'morning' && '🌅 Morning Duas'}
                  {currentDua.key === 'evening' && '🌆 Evening Duas'}
                  {currentDua.key === 'beforeSleep' && '🌙 Before Sleep'}
                </h3>

                {currentDua.duas.map((dua, idx) => (
                  <div key={idx} className="p-3 sm:p-4 bg-white rounded-xl border-2 border-emerald-200 space-y-2 sm:space-y-3">
                    <p className="text-xl sm:text-2xl text-right font-arabic text-emerald-900 leading-relaxed">
                      {dua.arabic}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 italic">{dua.english}</p>
                  </div>
                ))}

                <p className="text-[10px] sm:text-xs text-slate-600 mt-3 sm:mt-4">
                  May Allah accept your duas 🤲
                </p>

                <Button
                  onClick={() => setShow(false)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 min-h-[48px] text-sm sm:text-base pointer-events-auto"
                >
                  Ameen
                </Button>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}