import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  const containerRef = useRef(null);

  const pullThreshold = 80;
  const rotation = useTransform(pullDistance, [0, pullThreshold], [0, 180]);
  const opacity = useTransform(pullDistance, [0, pullThreshold], [0, 1]);

  const handleTouchStart = (e) => {
    if (containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    if (distance > 0) {
      e.preventDefault();
      pullDistance.set(Math.min(distance * 0.5, pullThreshold * 1.2));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance.get() >= pullThreshold) {
      setIsRefreshing(true);
      pullDistance.set(pullThreshold);
      
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          pullDistance.set(0);
        }, 500);
      }
    } else {
      pullDistance.set(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto h-full"
    >
      <motion.div
        style={{ opacity }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
      >
        <motion.div
          style={{ y: pullDistance, rotate: isRefreshing ? 360 : rotation }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          className="mt-4 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg"
        >
          <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}