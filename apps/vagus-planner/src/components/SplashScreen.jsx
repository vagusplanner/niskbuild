import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-teal-800 via-teal-600 to-amber-500"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl shadow-teal-900/30">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png"
                alt="Vagus Planner"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-lg">Vagus Planner</h1>
              <p className="text-white/80 text-sm mt-1 tracking-widest uppercase">Life · Faith · Balance</p>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 120 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              className="h-1 bg-white/60 rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}