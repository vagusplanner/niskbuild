import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  snapPoints = [0.5, 0.9],
  initialSnap = 0
}) {
  const [snapIndex, setSnapIndex] = React.useState(initialSnap);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Close if dragged down significantly
    if (offset > 100 || velocity > 500) {
      onClose();
      return;
    }

    // Snap to nearest point
    const currentHeight = window.innerHeight * snapPoints[snapIndex];
    const threshold = 50;

    if (offset < -threshold && snapIndex < snapPoints.length - 1) {
      setSnapIndex(snapIndex + 1);
    } else if (offset > threshold && snapIndex > 0) {
      setSnapIndex(snapIndex - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ 
              y: `${100 - (snapPoints[snapIndex] * 100)}%`,
            }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl"
            style={{
              maxHeight: `${snapPoints[snapPoints.length - 1] * 100}vh`,
              touchAction: 'none'
            }}
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center py-3">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-200 dark:border-slate-800">
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

            {/* Content */}
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}