import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Vagus Planner',
    subtitle: 'Your unified hub for calendar, goals, prayer, family & more',
    image: '🎯',
    description: 'Simplify your life with one app for everything that matters — calendar, tasks, goals, Islamic features, family & more.',
    action: 'Get Started',
    duration: '2 min tour'
  },
  {
    id: 'dashboard',
    title: 'Dashboard — Your Command Center',
    subtitle: 'Quick access to all important info',
    image: '📊',
    description: 'See upcoming events, goals, tasks, and AI insights in one glance. Add any task or event with one click.',
    tips: ['Use Quick Capture to add events instantly', 'See all your deadlines & priorities', 'AI suggests smart scheduling']
  },
  {
    id: 'calendar',
    title: 'Calendar — Master Your Time',
    subtitle: 'View & manage events, tasks, and prayers',
    image: '📅',
    description: 'Synced events from Google & Outlook. Prayer times auto-scheduled. Trip planning integrated.',
    tips: ['Drag-drop events to reschedule', 'See prayer times + external calendars', 'AI finds optimal meeting times']
  },
  {
    id: 'goals',
    title: 'Goals & Aspirations',
    subtitle: 'Life goals + spiritual growth in one place',
    image: '🏆',
    description: 'Track life, financial, and spiritual goals. Get AI coaching & collaborate with family.',
    tips: ['Create life goals (professional, fitness, etc)', 'Track spiritual growth (prayer, Quran, Hajj)', 'AI suggests next steps & milestones']
  },
  {
    id: 'islam',
    title: 'Islam Edition',
    subtitle: 'Prayers, Quran, Hajj, family & more',
    image: '🕌',
    description: 'Everything for your spiritual journey: prayer reminders, Quran reader, Hajj planner, family prayer hub, zakat calculator.',
    tips: ['Enable prayer notifications', 'Track daily Quran reading', 'Plan Hajj or Umrah with AI guide']
  },
  {
    id: 'connect',
    title: 'Connect — Stay Together',
    subtitle: 'Chat, groups, teams & safety map',
    image: '💬',
    description: 'Message friends, create groups for trips/projects, real-time messaging with full privacy.',
    tips: ['Share your profile with others', 'Create group chats for trips or projects', 'Search ⌘K to find anything instantly']
  },
  {
    id: 'complete',
    title: "You're All Set! 🎉",
    subtitle: 'Start your journey now',
    image: '✨',
    description: 'Navigate with just 5 main tabs. Most features are 1-click away. Use ⌘K to search anything instantly.',
    action: 'Start Exploring',
    tips: ['Press ⌘K (or Ctrl+K) to search anything', 'Customise colours & theme in Account', 'Check Notifications for reminders']
  }
];

export default function InteractiveOnboarding({ isOpen, onClose, onComplete, showDontShowAgain = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleDontShow = () => {
    onComplete?.();
    onClose();
  };

  const progress = Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
              style={{background:'linear-gradient(135deg, #D4E0EC 0%, #FFFFFF 100%)', border:'1px solid rgba(74,110,138,0.4)'}}>

              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between p-5 rounded-t-3xl" style={{background:'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 60%, #1D6FB8 100%)', borderBottom:'2px solid rgba(41,171,226,0.4)'}}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#E8B84B'}}>
                      Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.15)'}}>
                    <div className="h-full rounded-full transition-all duration-500" style={{width:`${progress}%`, background:'linear-gradient(90deg, #E8B84B, #29ABE2)'}} />
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors ml-4">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-5">
                <motion.div key={currentStep} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div className="text-6xl text-center">{step.image}</div>

                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black tracking-tight" style={{color:'#0D1A2A'}}>{step.title}</h2>
                    <p className="text-sm font-bold" style={{color:'#1D6FB8'}}>{step.subtitle}</p>
                  </div>

                  <p className="text-center text-sm leading-relaxed" style={{color:'#2D4A65'}}>{step.description}</p>

                  {step.tips && (
                    <div className="rounded-2xl p-4 space-y-2.5" style={{background:'rgba(29,111,184,0.08)', border:'1px solid rgba(29,111,184,0.2)'}}>
                      {step.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{color:'#1D6FB8'}} />
                          <p className="text-sm" style={{color:'#1B2A4A'}}>{tip}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.duration && currentStep === 0 && (
                    <div className="flex items-center justify-center gap-2 text-xs" style={{color:'#607B8B'}}>
                      <Play className="w-3.5 h-3.5" />
                      {step.duration}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 rounded-b-3xl p-5 space-y-2" style={{background:'rgba(212,224,236,0.9)', borderTop:'1px solid rgba(74,110,138,0.25)'}}>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0} className="flex-1">
                    ← Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 text-white" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)'}}>
                    {currentStep === ONBOARDING_STEPS.length - 1 ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" />{step.action || 'Complete'}</>
                    ) : (
                      <>{step.action || 'Next'}<ChevronRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
                {/* Don't show again — appears from step 1 onward */}
                {showDontShowAgain && currentStep > 0 && (
                  <button onClick={handleDontShow} className="w-full text-center text-xs py-1 hover:underline" style={{color:'#607B8B'}}>
                    Don't show this again
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}