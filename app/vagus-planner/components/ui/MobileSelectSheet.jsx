/**
 * MobileSelectSheet
 * On mobile: renders options as an iOS-style bottom sheet.
 * On desktop: falls back to standard shadcn Select.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

/**
 * @param {string}   value          - current selected value
 * @param {function} onValueChange  - called with new value
 * @param {Array}    options        - [{ value, label, content? }] — content is optional JSX
 * @param {string}   placeholder
 * @param {string}   className      - extra classes on trigger
 * @param {string}   triggerClassName
 */
export default function MobileSelectSheet({
  value,
  onValueChange,
  options = [],
  placeholder = 'Select…',
  className = '',
  triggerClassName = '',
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName || className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.content ?? opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: bottom sheet
  return (
    <>
      {/* Trigger button — mimics SelectTrigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-11 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${triggerClassName || className}`}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>
          {selected ? (selected.content ?? selected.label) : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[300]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle */}
              <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />
              {/* Title */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 text-center">{placeholder}</p>
              </div>
              {/* Options */}
              <div className="overflow-y-auto max-h-[60vh] py-2">
                {options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onValueChange(opt.value); setOpen(false); }}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 transition-colors min-h-[52px]"
                  >
                    <span className="text-base text-slate-800 dark:text-slate-100">
                      {opt.content ?? opt.label}
                    </span>
                    {value === opt.value && (
                      <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}