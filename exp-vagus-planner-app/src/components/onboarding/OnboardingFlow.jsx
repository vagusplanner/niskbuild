import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Calendar,
  Moon,
  Users,
  Sparkles,
  MapPin,
  Globe,
  X,
  Heart,
  Calculator
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import IslamicModeStep from './IslamicModeStep';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Vagus Planner! 🎉',
    description: 'Your intelligent calendar and life management platform',
    component: 'Welcome'
  },
  {
    id: 'edition',
    title: 'Choose your edition',
    description: 'Standard or Islamic — pick what suits you',
    component: 'IslamicMode'
  },
  {
    id: 'preferences',
    title: 'Tell us about yourself',
    description: 'Help us personalize your experience',
    component: 'Preferences'
  },
  {
    id: 'location',
    title: 'Set your location',
    description: 'For prayer times, local suggestions, and currency',
    component: 'Location'
  },
  {
    id: 'features',
    title: 'Explore key features',
    description: 'A quick tour of what you can do',
    component: 'Features'
  }
];

// Welcome Step
function WelcomeStep({ onNext }) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="p-6 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl shadow-2xl">
          <Calendar className="w-16 h-16 text-white" />
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          Welcome to MyAssistant!
        </h2>
        <p className="text-lg text-slate-600 max-w-md mx-auto">
          Your all-in-one platform for managing your calendar, prayers, health, social life, and more.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
        {[
          { icon: Calendar, label: 'Smart Calendar', color: 'from-blue-500 to-cyan-500' },
          { icon: Moon, label: 'Islamic Features', color: 'from-teal-500 to-emerald-500' },
          { icon: Users, label: 'Social Tools', color: 'from-purple-500 to-pink-500' },
          { icon: Sparkles, label: 'AI Assistant', color: 'from-orange-500 to-red-500' }
        ].map((feature, idx) => (
          <div key={idx} className="bg-slate-50 rounded-xl p-4 text-center">
            <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700">{feature.label}</p>
          </div>
        ))}
      </div>
      <Button onClick={onNext} size="lg" className="bg-teal-600 hover:bg-teal-700">
        Let's Get Started
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// Preferences Step
function PreferencesStep({ onNext, onBack, formData, setFormData }) {
  const focusAreas = ['work', 'health', 'personal', 'family', 'spiritual'];
  const workStyles = [
    { value: 'early-bird', label: '🌅 Early Bird', desc: 'Most productive in the morning' },
    { value: 'night-owl', label: '🦉 Night Owl', desc: 'Most productive at night' },
    { value: 'flexible', label: '⚡ Flexible', desc: 'Adapts to any schedule' }
  ];

  const toggleFocusArea = (area) => {
    const current = formData.focus_areas || [];
    setFormData({
      ...formData,
      focus_areas: current.includes(area) 
        ? current.filter(a => a !== area)
        : [...current, area]
    });
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">What's your work style?</h3>
        <div className="grid gap-3">
          {workStyles.map(style => (
            <button
              key={style.value}
              onClick={() => setFormData({ ...formData, work_style: style.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                formData.work_style === style.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-800">{style.label}</div>
              <div className="text-sm text-slate-600">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">What are your main focus areas?</h3>
        <p className="text-sm text-slate-600 mb-3">Select all that apply</p>
        <div className="flex flex-wrap gap-2">
          {focusAreas.map(area => (
            <button
              key={area}
              onClick={() => toggleFocusArea(area)}
              className={`px-4 py-2 rounded-full border-2 transition-all capitalize ${
                (formData.focus_areas || []).includes(area)
                  ? 'border-teal-500 bg-teal-500 text-white'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!formData.work_style || !formData.focus_areas?.length}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Location Step
function LocationStep({ onNext, onBack }) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const queryClient = useQueryClient();

  const detectLocationMutation = useMutation({
    mutationFn: async () => {
      return SDK.functions.invoke('detectUserLocation', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      setDetected(true);
      toast.success('Location detected successfully!');
      setDetecting(false);
    },
    onError: () => {
      toast.error('Failed to detect location');
      setDetecting(false);
    }
  });

  const handleDetect = () => {
    setDetecting(true);
    detectLocationMutation.mutate();
  };

  return (
    <div className="space-y-6 py-4 text-center">
      <div className="flex justify-center">
        <div className="p-4 bg-blue-100 rounded-full">
          {detected ? (
            <CheckCircle className="w-12 h-12 text-green-600" />
          ) : (
            <MapPin className="w-12 h-12 text-blue-600" />
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Set Your Location</h3>
        <p className="text-slate-600 max-w-md mx-auto">
          We'll use this for accurate prayer times, local currency, and personalized suggestions.
        </p>
      </div>

      {!detected ? (
        <Button 
          onClick={handleDetect} 
          disabled={detecting}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {detecting ? (
            <>Detecting...</>
          ) : (
            <>
              <Globe className="w-4 h-4 mr-2" />
              Auto-Detect Location
            </>
          )}
        </Button>
      ) : (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 inline-block">
          <p className="text-green-800 font-medium">✓ Location configured successfully!</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          {detected ? 'Continue' : 'Skip for Now'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Features Tour Step
function FeaturesStep({ onNext, onBack }) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: 'Smart Calendar',
      description: 'Manage events, meetings, and tasks with AI-powered scheduling',
      gradient: 'from-blue-500 to-cyan-500',
      page: 'Calendar'
    },
    {
      icon: Moon,
      title: 'Hajj & Umrah Planner',
      description: 'Complete pilgrimage planning with itineraries, group coordination, and smart packing lists',
      gradient: 'from-purple-500 to-indigo-500',
      page: 'Islamic'
    },
    {
      icon: Sparkles,
      title: 'AI Assistant',
      description: 'Get proactive suggestions, personalized Islamic learning, and automated scheduling',
      gradient: 'from-orange-500 to-amber-500',
      page: 'Calendar'
    },
    {
      icon: Users,
      title: 'Zakat & Sadaqah Tracker',
      description: 'Calculate Zakat, track charitable giving, and automate payments with calendar integration',
      gradient: 'from-emerald-500 to-teal-500',
      page: 'Islamic'
    }
  ];

  const current = features[currentFeature];

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className={`p-6 bg-gradient-to-br ${current.gradient} rounded-2xl shadow-xl`}>
            <current.icon className="w-16 h-16 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">{current.title}</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-4">{current.description}</p>
        {current.page && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate(createPageUrl(current.page));
              onNext();
            }}
            className="mt-2"
          >
            Try Now →
          </Button>
        )}
      </div>

      <div className="flex justify-center gap-2">
        {features.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentFeature(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === currentFeature ? 'w-8 bg-teal-600' : 'w-2 bg-slate-300'
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={() => currentFeature > 0 ? setCurrentFeature(currentFeature - 1) : onBack()}
          variant="outline" 
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentFeature > 0 ? 'Previous' : 'Back'}
        </Button>
        <Button 
          onClick={() => currentFeature < features.length - 1 ? setCurrentFeature(currentFeature + 1) : onNext()}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          {currentFeature < features.length - 1 ? 'Next Feature' : 'Continue'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Tutorial Step
function TutorialStep({ onNext, onBack }) {
  const [completed, setCompleted] = useState({});
  const navigate = useNavigate();

  const tutorials = [
    { id: 'zakat', label: 'Calculate Zakat', icon: Calculator, color: 'emerald', page: 'Islamic' },
    { id: 'hajj', label: 'Plan Hajj/Umrah Trip', icon: Moon, color: 'purple', page: 'Islamic' },
    { id: 'sadaqah', label: 'Track Sadaqah', icon: Heart, color: 'rose', page: 'Islamic' },
    { id: 'ai', label: 'Use AI Assistant', icon: Sparkles, color: 'amber', page: 'Calendar' }
  ];

  const allCompleted = tutorials.every(t => completed[t.id]);

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Try These Quick Actions</h3>
        <p className="text-slate-600">Get familiar with key features</p>
      </div>

      <div className="space-y-3">
        {tutorials.map(tutorial => (
          <div key={tutorial.id} className="flex gap-2">
            <button
              onClick={() => setCompleted({ ...completed, [tutorial.id]: true })}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                completed[tutorial.id]
                  ? 'border-green-500 bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-12 h-12 bg-${tutorial.color}-100 rounded-lg flex items-center justify-center`}>
                {completed[tutorial.id] ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <tutorial.icon className={`w-6 h-6 text-${tutorial.color}-600`} />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{tutorial.label}</div>
                <div className="text-sm text-slate-600">
                  {completed[tutorial.id] ? 'Completed!' : 'Click to try'}
                </div>
              </div>
            </button>
            {tutorial.page && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl(tutorial.page))}
                className="self-center"
              >
                Go →
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={!allCompleted}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          {allCompleted ? 'Finish Setup' : 'Complete Tutorials'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Main Onboarding Flow Component
export default function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const saveOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return SDK.entities.UserSettings.update(settings[0].id, {
          ...data,
          onboarding_completed: true
        });
      }
      return SDK.entities.UserSettings.create({
        ...data,
        onboarding_completed: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('🎉 Welcome to MyAssistant!');
      onComplete();
    }
  });

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveOnboardingMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              <span className="text-slate-600">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step.component === 'Welcome' && <WelcomeStep onNext={handleNext} />}
              {step.component === 'IslamicMode' && (
                <IslamicModeStep
                  onNext={handleNext}
                  onBack={handleBack}
                  formData={formData}
                  setFormData={setFormData}
                />
              )}
              {step.component === 'Preferences' && (
                <PreferencesStep 
                  onNext={handleNext} 
                  onBack={handleBack}
                  formData={formData}
                  setFormData={setFormData}
                />
              )}
              {step.component === 'Location' && (
                <LocationStep onNext={handleNext} onBack={handleBack} />
              )}
              {step.component === 'Features' && (
                <FeaturesStep onNext={handleNext} onBack={handleBack} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}