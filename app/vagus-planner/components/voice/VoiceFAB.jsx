/**
 * Floating Voice Capture Button — lives in Layout.
 * Single mic icon in the bottom-right area.
 * Opens VoiceCaptureHub as a sheet overlay.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import VoiceCaptureHub from './VoiceCaptureHub';
import { cn } from '@/lib/utils';

export default function VoiceFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[58]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Voice Hub Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-[59] w-full px-3 sm:px-0 sm:w-auto"
            style={{
              bottom: 'calc(6rem + env(safe-area-inset-bottom))',
              right: '0',
              left: '0',
              margin: '0 auto',
              maxWidth: '440px',
              // On desktop, align right like the FAB
              '@media (min-width: 640px)': { left: 'auto', right: '1rem' }
            }}
          >
            <div className="mx-auto sm:mr-4 sm:ml-auto">
              <VoiceCaptureHub onClose={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed z-[57] w-13 h-13 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
          open
            ? 'bg-slate-700 shadow-slate-400/20 dark:shadow-slate-900'
            : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200 dark:shadow-red-900'
        )}
        style={{
          width: '52px',
          height: '52px',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          left: '1rem',
        }}
        title="Voice Capture"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Mic className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring when idle */}
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full bg-red-400"
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}