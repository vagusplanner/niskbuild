import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingContext = createContext();

export const useFloatingManager = () => {
  const context = useContext(FloatingContext);
  if (!context) {
    throw new Error('useFloatingManager must be used within FloatingProvider');
  }
  return context;
};

export function FloatingProvider({ children }) {
  const [activeFloating, setActiveFloating] = useState(null);

  const openFloating = useCallback((id) => {
    setActiveFloating(id);
  }, []);

  const closeFloating = useCallback(() => {
    setActiveFloating(null);
  }, []);

  return (
    <FloatingContext.Provider value={{ activeFloating, openFloating, closeFloating }}>
      {children}
    </FloatingContext.Provider>
  );
}

// Floating Button Wrapper with proper stacking
export function FloatingButton({ id, position = 'bottom-right', stackOrder = 0, children, ...props }) {
  const { activeFloating } = useFloatingManager();
  const isActive = activeFloating === id;

  const positionClasses = {
    'bottom-right': 'right-4 lg:right-6',
    'bottom-left': 'left-4 lg:left-6',
    'top-right': 'right-4 lg:right-6',
    'top-left': 'left-4 lg:left-6',
  };

  const getStackPosition = () => {
    const base = positionClasses[position] || positionClasses['bottom-right'];
    return base;
  };
  
  const getInlineStyles = () => {
    // Stack vertically instead of horizontally
    if (position.includes('bottom')) {
      const bottomOffset = 80 + (stackOrder * 68); // 80px base + 68px per button
      return { bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` };
    }
    if (position.includes('top')) {
      const topOffset = 80 + (stackOrder * 68);
      return { top: `${topOffset}px` };
    }
    return {};
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`fixed ${getStackPosition()} safe-area-inset`}
      style={{ zIndex: 40 + stackOrder, ...getInlineStyles() }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Modal Wrapper with proper positioning and safe areas
export function ResponsiveModal({ isOpen, onClose, title, children, size = 'default' }) {
  const sizeClasses = {
    small: 'max-w-md',
    default: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-7xl',
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] safe-area-inset"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] overflow-y-auto safe-area-inset">
            <div className="min-h-full flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25 }}
                className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}