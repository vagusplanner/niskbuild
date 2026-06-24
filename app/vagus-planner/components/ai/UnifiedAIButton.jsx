import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Calendar, Plane, Heart, Moon, Zap } from 'lucide-react';
import UnifiedContextSidebar from './UnifiedContextSidebar';

// Page-specific colors matching brand palette
const PAGE_COLORS = {
  Calendar: { gradient: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)', ring: '#3b82f6', pulse: '#3b82f6' },
  Travel: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', ring: '#f59e0b', pulse: '#f59e0b' },
  Wellness: { gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)', ring: '#f43f5e', pulse: '#f43f5e' },
  Islam: { gradient: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', ring: '#a855f7', pulse: '#a855f7' },
  PrayerScheduler: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)', ring: '#f59e0b', pulse: '#f59e0b' },
  Dashboard: { gradient: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)', ring: '#0d9488', pulse: '#0d9488' },
  Finance: { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', ring: '#10b981', pulse: '#10b981' },
};

// Default gold for all other pages
const DEFAULT_COLOR = {
  gradient: 'linear-gradient(135deg, #E8B84B 0%, #f0c060 100%)',
  ring: '#E8B84B',
  pulse: '#E8B84B'
};

export default function UnifiedAIButton({ className = '', style = {} }) {
  const [showAI, setShowAI] = useState(false);
  const location = useLocation();

  // Detect current page
  const currentPage = location.pathname.split('/').pop() || 'Dashboard';
  const colors = PAGE_COLORS[currentPage] || DEFAULT_COLOR;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowAI(true)}
        className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all ring-2 group ${className}`}
        style={{
          background: colors.gradient,
          boxShadow: `0 8px 32px ${colors.pulse}40`,
          borderColor: colors.ring,
          ...style
        }}
        title="AI Assistant"
      >
        <Brain className="w-5 h-5 text-white" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full blur-sm"
          style={{ backgroundColor: `${colors.pulse}40` }}
        />
      </motion.button>

      <UnifiedContextSidebar isOpen={showAI} onClose={() => setShowAI(false)} />
    </>
  );
}