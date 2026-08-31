import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Layout mobile tab bar: 3.5rem bar + safe-area padding + small gap so footer taps never sit on nav. */
const MOBILE_NAV_CLEARANCE = 'calc(4rem + env(safe-area-inset-bottom, 0px))';

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
}) {
  const [snapIndex, setSnapIndex] = React.useState(initialSnap);
  const dragControls = useDragControls();

  const handleDragEnd = (event, info) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (offset > 100 || velocity > 500) {
      onClose();
      return;
    }

    const threshold = 50;
    if (offset < -threshold && snapIndex < snapPoints.length - 1) {
      setSnapIndex(snapIndex + 1);
    } else if (offset > threshold && snapIndex > 0) {
      setSnapIndex(snapIndex - 1);
    }
  };

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — below sheet, above app chrome (nav z-[52]) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-auto"
          />

          {/* Bottom Sheet — drag limited to handle so footer buttons receive taps */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{
              y: `${100 - snapPoints[snapIndex] * 100}%`,
            }}
            exit={{ y: '100%' }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 z-[151] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto"
            style={{
              bottom: MOBILE_NAV_CLEARANCE,
              maxHeight: `calc(100dvh - ${MOBILE_NAV_CLEARANCE} - 0.5rem)`,
            }}
          >
            {/* Drag Handle — only this region initiates sheet drag */}
            <div
              className="flex items-center justify-center py-3 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
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

            {/* Content — embedded forms manage scroll + footer; isolate stacking for footer taps */}
            <div className="relative z-[1] flex-1 min-h-0 overflow-hidden flex flex-col px-6 py-4">
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
