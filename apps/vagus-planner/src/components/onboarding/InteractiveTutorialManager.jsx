import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Sparkles,
  Moon,
  Calendar,
  Settings,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TUTORIAL_TOURS = {
  prayer_setup: {
    title: 'Set Up Prayer Times',
    icon: Moon,
    color: 'from-teal-500 to-cyan-600',
    steps: [
      {
        target: 'settings-button',
        title: 'Welcome to Islamic Features!',
        description: 'Let\'s set up your prayer times so you never miss a prayer. First, we\'ll go to Settings.',
        action: 'Navigate to Settings',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'location-detect',
        title: 'Set Your Location',
        description: 'Click "Detect My Location" to automatically configure prayer times for your area.',
        action: 'Detect location',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'prayer-method',
        title: 'Choose Calculation Method',
        description: 'Select the Islamic prayer time calculation method used in your region.',
        action: 'Select method',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'save-settings',
        title: 'Save Your Settings',
        description: 'Click Save to apply your prayer time configuration.',
        action: 'Save settings',
        page: 'Settings',
        highlight: true
      }
    ]
  },
  calendar_customization: {
    title: 'Customize Your Calendar',
    icon: Calendar,
    color: 'from-purple-500 to-indigo-600',
    steps: [
      {
        target: 'settings-button',
        title: 'Personalize Your Calendar',
        description: 'Let\'s customize your calendar colors, working hours, and date formats.',
        action: 'Go to Settings',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'calendar-customization',
        title: 'Calendar Customization Panel',
        description: 'Here you can customize event colors, working hours, and date formats to match your preferences.',
        action: 'Explore options',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'color-palette',
        title: 'Choose Your Colors',
        description: 'Select color themes for different event categories or create your own custom palette.',
        action: 'Pick colors',
        page: 'Settings',
        highlight: true
      },
      {
        target: 'working-hours',
        title: 'Set Working Hours',
        description: 'Define your work schedule so the app can suggest optimal meeting times.',
        action: 'Configure hours',
        page: 'Settings',
        highlight: true
      }
    ]
  },
  ai_assistant: {
    title: 'Use the AI Assistant',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-600',
    steps: [
      {
        target: 'ai-chat-widget',
        title: 'Meet Your AI Assistant',
        description: 'The AI assistant can help you schedule events, answer questions, and provide insights.',
        action: 'Click to open',
        page: 'Calendar',
        highlight: true
      },
      {
        target: 'ai-quick-actions',
        title: 'Quick Actions',
        description: 'Use these quick action buttons to perform common tasks instantly.',
        action: 'Try an action',
        page: 'Calendar',
        highlight: true
      },
      {
        target: 'ai-chat-input',
        title: 'Natural Language Commands',
        description: 'Type naturally! Ask "When is my next prayer?" or "Schedule a meeting tomorrow at 2pm".',
        action: 'Try a command',
        page: 'Calendar',
        highlight: true
      }
    ]
  }
};

export default function InteractiveTutorialManager({ onComplete, onSkip }) {
  const [activeTour, setActiveTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTourMenu, setShowTourMenu] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settings[0]?.id) {
        return base44.entities.UserSettings.update(settings[0].id, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    }
  });

  const startTour = (tourKey) => {
    setActiveTour(tourKey);
    setCurrentStep(0);
    setShowTourMenu(false);
    
    const tour = TUTORIAL_TOURS[tourKey];
    if (tour.steps[0].page) {
      navigate(createPageUrl(tour.steps[0].page));
    }
  };

  const nextStep = () => {
    const tour = TUTORIAL_TOURS[activeTour];
    if (currentStep < tour.steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      
      const nextStepData = tour.steps[nextStepIndex];
      if (nextStepData.page) {
        navigate(createPageUrl(nextStepData.page));
      }
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      
      const prevStepData = TUTORIAL_TOURS[activeTour].steps[prevStepIndex];
      if (prevStepData.page) {
        navigate(createPageUrl(prevStepData.page));
      }
    }
  };

  const completeTour = () => {
    toast.success('Tutorial completed!');
    setActiveTour(null);
    setCurrentStep(0);
    setShowTourMenu(true);
  };

  const skipTutorial = () => {
    updateSettingsMutation.mutate({ tutorial_completed: true });
    if (onComplete) onComplete();
    toast.info('You can access tutorials anytime from Settings');
  };

  const finishAllTutorials = () => {
    updateSettingsMutation.mutate({ 
      tutorial_completed: true,
      onboarding_completed: true 
    });
    if (onComplete) onComplete();
    toast.success('All set! Enjoy using the app');
  };

  if (!showTourMenu && !activeTour) return null;

  return (
    <AnimatePresence>
      {showTourMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-7 h-7 text-teal-600" />
                    Welcome! Let's Get Started
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Choose a tutorial to learn about key features
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipTutorial}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {Object.entries(TUTORIAL_TOURS).map(([key, tour]) => {
                const Icon = tour.icon;
                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startTour(key)}
                    className={`w-full p-5 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-gradient-to-r ${tour.color} bg-opacity-10 transition-all text-left group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tour.color} flex items-center justify-center text-white shadow-lg`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 text-lg mb-1">
                          {tour.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {tour.steps.length} steps • ~2 minutes
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <Button
                onClick={finishAllTutorials}
                variant="outline"
                className="w-full"
              >
                Skip All Tutorials
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTour && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50 max-w-md"
        >
          <Card className="shadow-2xl border-2 border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge className={`bg-gradient-to-r ${TUTORIAL_TOURS[activeTour].color} text-white`}>
                  Step {currentStep + 1} of {TUTORIAL_TOURS[activeTour].steps.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={completeTour}
                  className="h-6 w-6 -mt-1 -mr-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {TUTORIAL_TOURS[activeTour].steps[currentStep].title}
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {TUTORIAL_TOURS[activeTour].steps[currentStep].description}
              </p>

              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={nextStep}
                  className={`flex-1 bg-gradient-to-r ${TUTORIAL_TOURS[activeTour].color} hover:opacity-90 text-white`}
                >
                  {currentStep === TUTORIAL_TOURS[activeTour].steps.length - 1 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-4 flex gap-1">
                {TUTORIAL_TOURS[activeTour].steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      idx <= currentStep ? 'bg-teal-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}