import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOBILE_NAV_CLEARANCE, MOBILE_OVERLAY_Z } from '@/lib/mobile-layout';

/** Layout mobile tab bar clearance — keep in sync with Layout.jsx bottom nav. */

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
}) {
  const [snapIndex, setSnapIndex] = React.useState(initialSnap);

  React.useEffect(() => {
    if (isOpen) setSnapIndex(initialSnap);
  }, [isOpen, initialSnap]);

  const sheetHeight = `min(${Math.round((snapPoints[snapPoints.length - 1] ?? 0.9) * 100)}dvh, calc(100dvh - ${MOBILE_NAV_CLEARANCE} - 0.5rem))`;

  const overlay = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            key="mobile-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            style={{ zIndex: MOBILE_OVERLAY_Z }}
          />

          <motion.div
            key="mobile-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto"
            style={{
              zIndex: MOBILE_OVERLAY_Z + 1,
              bottom: MOBILE_NAV_CLEARANCE,
              height: sheetHeight,
              maxHeight: sheetHeight,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content — forms own scroll; avoid overflow:hidden so native date/time pickers work on iOS */}
            <div className="relative z-[1] flex-1 min-h-0 flex flex-col px-6 pb-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(overlay, document.body);
}
