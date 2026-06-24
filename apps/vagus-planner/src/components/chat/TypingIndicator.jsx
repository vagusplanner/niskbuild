import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator({ names = [] }) {
  if (names.length === 0) return null;
  const label = names.length === 1
    ? `${names[0]} is typing`
    : `${names.slice(0, 2).join(', ')} are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 px-4 py-1.5"
    >
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-[11px] text-slate-400 italic">{label}</span>
    </motion.div>
  );
}