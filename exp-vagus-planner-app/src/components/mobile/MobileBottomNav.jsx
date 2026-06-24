import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Moon,
  Heart,
  Users,
} from 'lucide-react';

/**
 * Optimized mobile bottom navigation bar for core sections
 */
export default function MobileBottomNav({ 
  currentPageName, 
  tabHistory = {}, 
  onTabChange = () => {},
  className = "" 
}) {
  const MOBILE_TAB_ITEMS = [
    { name: 'Home', icon: Home, page: 'Dashboard' },
    { name: 'Calendar', icon: Calendar, page: 'Calendar' },
    { name: 'Islam', icon: Moon, page: 'Islam' },
    { name: 'Life', icon: Heart, page: 'Wellness' },
    { name: 'Connect', icon: Users, page: 'Connect' },
  ];

  const handleTabClick = (item) => {
    const isActive = currentPageName === item.page;
    onTabChange(item.page, isActive);
  };

  return (
    <nav 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-gradient-to-t from-white/98 via-amber-50/40 to-teal-50/80 dark:from-teal-950/98 dark:via-teal-950/96 dark:to-cyan-950/94',
        'backdrop-blur-2xl border-t border-amber-200/40 dark:border-teal-800/30 shadow-xl shadow-amber-900/6',
        'transform-none',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', willChange: 'auto' }}
      data-tour="navigation"
    >
      <div className="flex items-center justify-around" style={{ height: '3.5rem', minHeight: '56px' }}>
        {MOBILE_TAB_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentPageName === item.page;

          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={() => handleTabClick(item)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-3 py-1 sm:py-1.5',
                'rounded-lg sm:rounded-xl transition-all duration-300 flex-1 relative',
                'no-select touch-feedback min-h-[56px] active:scale-95',
                isActive
                  ? 'text-teal-800 dark:text-amber-300 bg-gradient-to-br from-amber-100/70 via-teal-50/60 to-emerald-100/50 dark:from-teal-900/50 dark:via-teal-900/40 dark:to-cyan-900/30 shadow-md shadow-amber-200/40 dark:shadow-amber-900/30'
                  : 'text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 active:bg-slate-100 dark:active:bg-slate-800'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
              <span className="text-[9px] sm:text-[10px] font-medium no-select leading-tight">
                {item.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-lg shadow-amber-400/60"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}