import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles,
  Calendar, CheckSquare, Brain, Star, Bell, Moon,
  Zap, Heart, Play, ArrowRight, Target, Activity
} from 'lucide-react';

// All possible tour steps keyed by id
const ALL_STEPS = {
  welcome: {
    id: 'welcome',
    icon: Sparkles,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50 dark:bg-teal-950',
    badge: '👋 Welcome',
    title: 'Welcome to Vagus Planner',
    description: "Your all-in-one intelligent life organiser — blending calendar management, Islamic features, wellness tracking, and AI assistance. Let's take a quick tour!",
    target: null,
    position: 'center',
    features: ['Smart Calendar', 'AI Assistant', 'Islamic Features', 'Wellness Tracking'],
    cta: 'Start Tour'
  },
  calendar: {
    id: 'calendar',
    icon: Calendar,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950',
    badge: '📅 Calendar',
    title: 'Smart Calendar',
    description: 'Your unified calendar shows events, tasks, prayer times, and Islamic dates in one place. Switch between month, week, day, and agenda views instantly.',
    target: '[data-tour="navigation"]',
    position: 'right',
    highlight: true,
    tip: 'Tap Calendar in the navigation to open it',
    highlightLabel: '← Navigation'
  },
  tasks: {
    id: 'tasks',
    icon: CheckSquare,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950',
    badge: '✅ Tasks',
    title: 'Task Management',
    description: 'Create, prioritise and track tasks with due dates, categories and subtasks. Link tasks to calendar events and get AI-powered priority suggestions.',
    target: '[data-tour="quick-actions"]',
    position: 'top',
    highlight: true,
    tip: 'Use Quick Actions (+) to instantly add a task or event',
    highlightLabel: 'Quick Add ↑'
  },
  ai: {
    id: 'ai',
    icon: Brain,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50 dark:bg-purple-950',
    badge: '🤖 AI',
    title: 'AI Assistant',
    description: 'Your intelligent companion analyses your schedule, suggests optimal times, detects conflicts, and schedules events from natural language — just describe what you need.',
    target: '[data-tour="voice-assistant"]',
    position: 'left',
    highlight: true,
    tip: 'Try: "Schedule a team meeting tomorrow at 2pm for 1 hour"',
    highlightLabel: 'Voice AI →'
  },
  islamic: {
    id: 'islamic',
    icon: Moon,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950',
    badge: '🕌 Islam',
    title: 'Islamic Features',
    description: 'Accurate prayer times with Adhan, Hijri calendar, Quran reader, Ramadan tracker, Hajj planner, Zakat calculator and personalised Islamic content — all in the Islam tab.',
    target: '[data-tour="navigation"]',
    position: 'right',
    highlight: true,
    tip: 'Tap the Islam tab (crescent icon) in the navigation',
    highlightLabel: '← Islam Tab'
  },
  wellness: {
    id: 'wellness',
    icon: Heart,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950',
    badge: '💪 Life',
    title: 'Wellness & Health',
    description: 'Track sleep, mood, energy, nutrition and exercise. Get personalised AI health coaching and weekly insights to keep your body and mind in peak condition.',
    target: '[data-tour="navigation"]',
    position: 'right',
    highlight: true,
    tip: 'Visit the Life tab for all health and wellness features',
    highlightLabel: '← Life Tab'
  },
  habits: {
    id: 'habits',
    icon: Star,
    iconColor: 'text-cyan-500',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950',
    badge: '🔥 Habits',
    title: 'Habit Tracker',
    description: 'Build powerful daily habits with streak tracking, gamification badges, and Sunnah habit suggestions. Your AI coach celebrates your wins and nudges you on tough days.',
    target: '[data-tour="navigation"]',
    position: 'right',
    highlight: true,
    tip: 'Find Habits inside the Life tab',
    highlightLabel: '← Life Tab'
  },
  goals: {
    id: 'goals',
    icon: Target,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950',
    badge: '🎯 Goals',
    title: 'Goal Setting',
    description: 'Set personal, professional, spiritual or health goals with milestones and action steps. Collaborate with others and let the AI break big goals into manageable steps.',
    target: '[data-tour="navigation"]',
    position: 'right',
    highlight: true,
    tip: 'Goals are in the Life tab — set your first one today',
    highlightLabel: '← Life Tab'
  },
  notifications: {
    id: 'notifications',
    icon: Bell,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50 dark:bg-orange-950',
    badge: '🔔 Reminders',
    title: 'Smart Notifications',
    description: 'Get reminded at the right time — prayer alerts, task deadlines, morning briefings after Fajr, and proactive AI nudges based on your schedule and energy level.',
    target: null,
    position: 'center',
    tip: 'Customise alerts in Account → Settings → Notifications'
  },
  complete: {
    id: 'complete',
    icon: Zap,
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50 dark:bg-teal-950',
    badge: '🎉 Ready!',
    title: "You're All Set!",
    description: "You now know the essentials. Every section has AI-powered insights and contextual tooltips to guide you as you explore. Enjoy your personalised experience!",
    target: null,
    position: 'center',
    features: ['Re-run tour from Account → Settings → Help', 'Ask the AI assistant any question', 'Invite family to share calendars'],
    cta: 'Start Exploring'
  }
};

// Decide which steps to show based on user interests
function buildTourSteps(interests = []) {
  const steps = ['welcome', 'calendar', 'tasks', 'ai'];

  if (interests.includes('spiritual') || interests.length === 0) steps.push('islamic');
  if (interests.includes('health')) steps.push('wellness');
  if (interests.length > 0) steps.push('habits');
  if (interests.includes('personal') || interests.includes('work')) steps.push('goals');
  steps.push('notifications');
  steps.push('complete');

  // Deduplicate
  return [...new Set(steps)].map(id => ALL_STEPS[id]);
}

// First-access feature tooltip — shown when a feature is first visited
const FEATURE_TOOLTIPS = {
  Islam: {
    title: '🕌 Islamic Hub',
    body: 'Prayer times, Quran reader, Hijri calendar, Dhikr counter, and more — all personalised to your location and method.',
    cta: 'Got it'
  },
  Wellness: {
    title: '💪 Life & Wellness',
    body: 'Track health metrics, build habits, set goals, and get weekly AI coaching insights.',
    cta: 'Got it'
  },
  Calendar: {
    title: '📅 Smart Calendar',
    body: 'Try natural-language scheduling — tap the AI button and say "Remind me to call Mum on Friday at 6pm".',
    cta: 'Got it'
  },
  Dashboard: {
    title: '🏠 Your Home Dashboard',
    body: 'Morning briefings, upcoming events, prayer times, and AI-powered insights greet you every day.',
    cta: 'Got it'
  }
};

function FirstAccessTooltip({ page, onDismiss }) {
  const data = FEATURE_TOOLTIPS[page];
  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[min(360px,90vw)]"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-400" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{data.title}</h4>
              <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{data.body}</p>
            <Button size="sm" onClick={onDismiss} className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white">
              {data.cta}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function GuidedTour({ isOpen, onClose, onComplete, userInterests = [] }) {
  const [tourSteps, setTourSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [direction, setDirection] = useState(1);

  // First-access tooltips
  const [firstAccessPage, setFirstAccessPage] = useState(null);

  // Build personalised steps when tour opens
  useEffect(() => {
    if (isOpen) {
      setTourSteps(buildTourSteps(userInterests));
      setCurrentStep(0);
    }
  }, [isOpen, userInterests]);

  const step = tourSteps[currentStep];
  const Icon = step?.icon;
  const isCentered = !step?.target || step?.position === 'center';

  const updateHighlight = useCallback(() => {
    if (!step?.target) { setHighlightRect(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setHighlightRect(null); return; }

    const rect = el.getBoundingClientRect();
    const pad = 10;
    const hRect = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
    setHighlightRect(hRect);

    const tw = 340, th = 280, gap = 16;
    let top, left;
    switch (step.position) {
      case 'right': top = rect.top + rect.height / 2 - th / 2; left = rect.right + gap; break;
      case 'left': top = rect.top + rect.height / 2 - th / 2; left = rect.left - tw - gap; break;
      case 'bottom': top = rect.bottom + gap; left = rect.left + rect.width / 2 - tw / 2; break;
      case 'top': top = rect.top - th - gap; left = rect.left + rect.width / 2 - tw / 2; break;
      default: top = window.innerHeight / 2 - th / 2; left = window.innerWidth / 2 - tw / 2;
    }
    top = Math.max(16, Math.min(top, window.innerHeight - th - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    setTooltipPos({ top, left });
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [isOpen, currentStep, updateHighlight]);

  // Listen for page changes to show first-access tooltips
  useEffect(() => {
    const handler = (e) => {
      const page = e.detail?.page;
      if (!page) return;
      const storageKey = `first_access_${page}`;
      if (!localStorage.getItem(storageKey) && FEATURE_TOOLTIPS[page]) {
        localStorage.setItem(storageKey, '1');
        setFirstAccessPage(page);
      }
    };
    window.addEventListener('page_first_access', handler);
    return () => window.removeEventListener('page_first_access', handler);
  }, []);

  const go = (dir) => {
    setDirection(dir);
    setCurrentStep(s => s + dir);
  };

  const handleComplete = () => {
    localStorage.setItem('guided_tour_completed', 'true');
    onComplete?.();
    onClose?.();
  };

  if (!isOpen && !firstAccessPage) return null;

  // First-access tooltip (standalone, no tour overlay)
  if (!isOpen && firstAccessPage) {
    return <FirstAccessTooltip page={firstAccessPage} onDismiss={() => setFirstAccessPage(null)} />;
  }

  if (!step) return null;

  const progress = tourSteps.length > 0 ? ((currentStep + 1) / tourSteps.length) * 100 : 0;
  const isLast = currentStep === tourSteps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <>
      {/* First-access tooltip (can show during tour too) */}
      {firstAccessPage && (
        <FirstAccessTooltip page={firstAccessPage} onDismiss={() => setFirstAccessPage(null)} />
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[500] pointer-events-none">
            {/* Overlay */}
            {isCentered ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
              />
            ) : (
              <>
                {/* Spotlight mask */}
                {highlightRect && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'rgba(0,0,0,0.65)',
                      WebkitMaskImage: `radial-gradient(ellipse ${highlightRect.width}px ${highlightRect.height}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 85%, black 100%)`,
                      maskImage: `radial-gradient(ellipse ${highlightRect.width}px ${highlightRect.height}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 85%, black 100%)`
                    }}
                  />
                )}
                {/* Glowing border */}
                {highlightRect && (
                  <motion.div
                    key={currentStep + '-highlight'}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    className="absolute pointer-events-none rounded-xl"
                    style={{
                      top: highlightRect.top, left: highlightRect.left,
                      width: highlightRect.width, height: highlightRect.height,
                      border: '2.5px solid rgba(20,184,166,0.9)',
                      boxShadow: '0 0 0 4px rgba(20,184,166,0.2), 0 0 30px rgba(20,184,166,0.4)'
                    }}
                  >
                    {step.highlightLabel && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                        {step.highlightLabel}
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {/* Tooltip card */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.92, y: direction > 0 ? 18 : -18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: direction > 0 ? -18 : 18 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="absolute pointer-events-auto"
              style={
                isCentered
                  ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }
                  : { top: tooltipPos.top, left: tooltipPos.left, zIndex: 10 }
              }
              onClick={e => e.stopPropagation()}
            >
              <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden ${isCentered ? 'w-[min(460px,92vw)]' : 'w-[340px]'}`}>
                {/* Gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400" />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${step.iconBg}`}>
                        <Icon className={`w-4 h-4 ${step.iconColor}`} />
                      </div>
                      <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {step.badge}
                      </Badge>
                    </div>
                    <button onClick={handleComplete} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{step.description}</p>

                  {/* Personalised tag (if interests drove this step) */}
                  {userInterests.length > 0 && !isCentered && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Sparkles className="w-3 h-3 text-teal-500" />
                      <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Personalised for you</span>
                    </div>
                  )}

                  {/* Feature list */}
                  {step.features && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {step.features.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200/60 dark:border-teal-800/60 font-medium">
                          <Check className="w-3 h-3" /> {f}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tip */}
                  {step.tip && (
                    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 rounded-xl p-3 mb-4">
                      <span className="text-base">💡</span>
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-snug">{step.tip}</p>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Step dots */}
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    {tourSteps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setDirection(i > currentStep ? 1 : -1); setCurrentStep(i); }}
                        className={`rounded-full transition-all duration-300 ${
                          i === currentStep ? 'w-5 h-2 bg-teal-500' : i < currentStep ? 'w-2 h-2 bg-teal-300' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={handleComplete} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-1">
                      Skip tour
                    </button>
                    <div className="flex items-center gap-2">
                      {!isFirst && (
                        <Button variant="outline" size="sm" onClick={() => go(-1)} className="h-8 px-3 text-xs">
                          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Back
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={isLast ? handleComplete : () => go(1)}
                        className="h-8 px-4 text-xs bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-md shadow-teal-200/50"
                      >
                        {isLast ? (
                          <>{step.cta || 'Start Exploring'} <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                        ) : isFirst ? (
                          <><Play className="w-3.5 h-3.5 mr-1" />{step.cta || 'Start Tour'}</>
                        ) : (
                          <>Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}