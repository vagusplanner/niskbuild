import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  Bell, 
  Check,
  Plus,
  Users,
  Target
} from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to VAGUS PLANNER! 🎉',
    description: 'Let\'s take a quick tour of the key features to help you get started.',
    icon: Calendar,
    color: 'teal',
    target: null
  },
  {
    id: 'create-event',
    title: 'Create Your First Event',
    description: 'Click the "New Event" button to schedule meetings, appointments, and tasks. You can set reminders, add locations, and invite others.',
    icon: Plus,
    color: 'blue',
    target: 'new-event-button',
    action: 'Click "New Event" to continue'
  },
  {
    id: 'ai-scheduling',
    title: 'AI-Powered Scheduling',
    description: 'Let AI help you schedule events intelligently. It analyzes your calendar, suggests optimal times, and avoids conflicts automatically.',
    icon: Sparkles,
    color: 'purple',
    target: 'ai-tools-button',
    action: 'Try AI Tools to see suggestions'
  },
  {
    id: 'notifications',
    title: 'Stay Notified',
    description: 'Customize your notification preferences in Settings. Get reminders for events, deadlines, and AI suggestions via email or push notifications.',
    icon: Bell,
    color: 'amber',
    target: 'settings-link',
    action: 'Check Settings for notification options'
  },
  {
    id: 'calendar-views',
    title: 'Multiple Calendar Views',
    description: 'Switch between Month, Week, Day, Agenda, and Timeline views to see your schedule the way you prefer.',
    icon: Calendar,
    color: 'emerald',
    target: 'calendar-view',
    action: 'Try different views'
  },
  {
    id: 'collaboration',
    title: 'Collaborate with Teams',
    description: 'Share events, create meetings, and coordinate with others. Use the Social Scheduler to find time that works for everyone.',
    icon: Users,
    color: 'pink',
    target: 'ai-tools-button',
    action: 'Explore collaboration features'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You\'re ready to master your schedule with VAGUS PLANNER. Explore more features as you go, and don\'t forget to check the Help Center if you need assistance.',
    icon: Check,
    color: 'green',
    target: null
  }
];

export default function InteractiveTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  useEffect(() => {
    // Highlight target element if exists
    if (step.target) {
      const element = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      // Remove highlights on cleanup
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [step.target]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setCompleted(true);
    
    // Update user settings to mark tutorial as completed
    try {
      const settings = await SDK.entities.UserSettings.list();
      if (settings[0]) {
        await SDK.entities.UserSettings.update(settings[0].id, {
          ...settings[0],
          tutorial_completed: true
        });
      }
    } catch (error) {
      console.error('Failed to update tutorial status:', error);
    }

    toast.success('Tutorial completed! 🎉');
    setTimeout(() => onComplete(), 500);
  };

  const handleSkip = async () => {
    try {
      const settings = await SDK.entities.UserSettings.list();
      if (settings[0]) {
        await SDK.entities.UserSettings.update(settings[0].id, {
          ...settings[0],
          tutorial_completed: true
        });
      }
    } catch (error) {
      console.error('Failed to update tutorial status:', error);
    }
    onSkip();
  };

  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative"
        >
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-2 border-teal-200 dark:border-teal-800">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${step.color}-100 dark:bg-${step.color}-900/30`}>
                  <Icon className={`w-6 h-6 text-${step.color}-600 dark:text-${step.color}-400`} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {step.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {step.action && (
                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                    💡 {step.action}
                  </p>
                </div>
              )}

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 pt-4">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentStep
                        ? 'w-8 bg-teal-600 dark:bg-teal-400'
                        : idx < currentStep
                        ? 'w-2 bg-teal-400 dark:bg-teal-600'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {currentStep > 0 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleSkip} className="text-slate-600 dark:text-slate-400">
                  Skip Tutorial
                </Button>
              )}

              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    Complete
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}