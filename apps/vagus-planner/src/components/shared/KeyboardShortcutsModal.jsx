import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { keys: ['G', 'H'], desc: 'Go to Home / Dashboard' },
      { keys: ['G', 'C'], desc: 'Go to Calendar' },
      { keys: ['G', 'I'], desc: 'Go to Islam' },
      { keys: ['G', 'T'], desc: 'Go to Goals' },
      { keys: ['G', 'N'], desc: 'Go to Connect' },
    ]
  },
  {
    category: 'Global',
    items: [
      { keys: ['⌘', 'K'], desc: 'Quick Search' },
      { keys: ['?'], desc: 'Show keyboard shortcuts' },
      { keys: ['Esc'], desc: 'Close modal / go back' },
    ]
  },
  {
    category: 'Calendar',
    items: [
      { keys: ['N'], desc: 'New event' },
      { keys: ['T'], desc: 'Jump to today' },
      { keys: ['←'], desc: 'Previous period' },
      { keys: ['→'], desc: 'Next period' },
      { keys: ['M'], desc: 'Month view' },
      { keys: ['W'], desc: 'Week view' },
      { keys: ['D'], desc: 'Day view' },
    ]
  },
  {
    category: 'Tasks & Goals',
    items: [
      { keys: ['⌘', 'Enter'], desc: 'Save / create item' },
      { keys: ['Space'], desc: 'Toggle task complete' },
    ]
  },
];

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 shadow-sm">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] max-h-[80vh] overflow-y-auto z-[101] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
                  <Keyboard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <h2 className="font-black text-slate-800 dark:text-slate-100">Keyboard Shortcuts</h2>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {SHORTCUTS.map(group => (
                <div key={group.category}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{group.category}</p>
                  <div className="space-y-2">
                    {group.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, ki) => (
                            <React.Fragment key={ki}>
                              {ki > 0 && <span className="text-slate-300 dark:text-slate-600 text-xs">+</span>}
                              <Kbd>{k}</Kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}