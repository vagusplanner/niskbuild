import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAgentFAB() {
  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('open_super_agent'));
  };

  return (
    <div className="fixed right-4 z-[44] lg:z-[44]" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleOpen}
        className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all bg-gradient-to-br from-[#E8B84B] via-[#f0c060] to-[#3ecfa0] ring-2 ring-[#E8B84B]/70 hover:ring-[#E8B84B] shadow-[#E8B84B]/40"
      >
        <Brain className="w-6 h-6 text-white drop-shadow" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-full bg-[#E8B84B]/30"
        />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </motion.button>
    </div>
  );
}