import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Moon,
  Calendar,
  MapPin,
  User,
  Brain,
  Bell
} from 'lucide-react';
import WelcomeQuestionnaire from './WelcomeQuestionnaire';
import InteractiveTutorialManager from './InteractiveTutorialManager';
import AIOnboardingAssistant from './AIOnboardingAssistant';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

const PRAYER_METHODS = [
  { value: 'MWL', label: 'Muslim World League' },
  { value: 'ISNA', label: 'Islamic Society of North America (ISNA)' },
  { value: 'Egypt', label: 'Egyptian General Authority' },
  { value: 'Makkah', label: 'Umm Al-Qura, Makkah' },
  { value: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
  { value: 'Tehran', label: 'Institute of Geophysics, Tehran' },
  { value: 'Jafari', label: 'Shia Ithna-Ashari' }
];

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome!',
    description: 'Your journey begins here',
    icon: Sparkles,
    component: 'welcome'
  },
  {
    id: 'islamic',
    title: 'Prayer Setup',
    description: 'Location & prayer method',
    icon: Moon,
    component: 'islamic'
  },
  {
    id: 'preferences',
    title: 'Your Goals',
    description: 'Quick personalisation',
    icon: User,
    component: 'questionnaire'
  }
];

export default function EnhancedOnboardingFlow({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [islamicSetup, setIslamicSetup] = useState({ city: '', country: '', prayer_method: 'MWL' });
  const [detectingLocation, setDetectingLocation] = useState(false);
  // Collect interests from questionnaire to power the personalised tour
  const [userInterests, setUserInterests] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleStepComplete = (data) => {
    setCompletedSteps([...completedSteps, currentStep.id]);
    // If the questionnaire step passes back focus areas, store them
    if (data?.focus_areas) {
      setUserInterests(data.focus_areas);
    }
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Pass interests to Layout via a custom event so the guided tour can personalise
      window.dispatchEvent(new CustomEvent('onboarding_complete', { detail: { interests: userInterests } }));
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const detectLocation = () => {
    if (!('geolocation' in navigator)) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
        const data = await res.json();
        setIslamicSetup(prev => ({ ...prev, city: data.city || data.locality || '', country: data.countryName || '' }));
      } catch {
        // silent
      } finally {
        setDetectingLocation(false);
      }
    }, () => setDetectingLocation(false));
  };

  const saveIslamicSetup = async () => {
    try {
      const existing = await SDK.entities.UserSettings.list();
      const data = { location_city: islamicSetup.city, location_country: islamicSetup.country, prayer_method: islamicSetup.prayer_method, prayer_enabled: true };
      if (existing?.[0]?.id) {
        await SDK.entities.UserSettings.update(existing[0].id, data);
      } else {
        await SDK.entities.UserSettings.create(data);
      }
    } catch { /* silent */ }
    handleStepComplete();
  };

  return (
    <>
      {/* AI Onboarding Assistant */}
      <AIOnboardingAssistant 
        userProfile={user}
        currentStep={currentStep.id}
        onboardingData={{}}
        onComplete={onComplete}
      />
      
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm">Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}</span>
              <button
                onClick={handleSkip}
                className="text-white/60 hover:text-white text-sm underline underline-offset-2 transition-colors px-2 py-1 min-h-[44px] flex items-center"
              >
                Skip setup →
              </button>
            </div>
            <Progress value={progress} className="h-2 bg-slate-700" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-8">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-green-600 text-white' : 
                      isCurrent ? 'bg-teal-600 text-white' : 
                      'bg-slate-700 text-slate-400'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 rounded transition-colors ${
                      isCompleted ? 'bg-green-600' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white shadow-2xl border-0">
                <CardContent className="p-8">
                  {currentStep.component === 'welcome' && (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-200">
                        <Sparkles className="w-12 h-12 text-white" />
                      </div>
                      <h2 className="text-4xl font-bold text-slate-800 mb-3">
                        Welcome{user?.full_name ? `, ${user.full_name}` : ''}! 👋
                      </h2>
                      <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
                        Your intelligent Islamic calendar and personal assistant
                      </p>
                      
                      {/* Social Proof */}
                      <div className="max-w-2xl mx-auto mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <div className="flex -space-x-2">
                            {['👨‍💼', '👩‍💻', '🧑‍🎓', '👨‍⚕️'].map((emoji, i) => (
                              <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center border-2 border-white shadow-md">
                                <span className="text-lg">{emoji}</span>
                              </div>
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">+10,000 users</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-slate-700 italic mb-2">"Finally, a calendar that understands my prayer times!"</p>
                            <p className="text-xs text-slate-500">- Ahmed K.</p>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-slate-700 italic mb-2">"The AI assistant saves me hours every week."</p>
                            <p className="text-xs text-slate-500">- Sarah M.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="max-w-xl mx-auto mb-10 grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-teal-50 rounded-xl">
                          <Calendar className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-700">Smart Calendar</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl">
                          <Moon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-700">Prayer Times</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl">
                          <Brain className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-700">AI Assistant</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-8">Let's personalize your experience in just 2 minutes</p>

                      <div className="flex gap-4 justify-center">
                        <Button
                          onClick={handleStepComplete}
                          size="lg"
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg"
                        >
                          Let's Start
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button
                          onClick={handleSkip}
                          variant="ghost"
                          size="lg"
                        >
                          Skip for now
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep.component === 'islamic' && (
                    <div className="py-6">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <Moon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Set Up Prayer Times</h3>
                        <p className="text-slate-500">Tell us where you are so we can show accurate prayer times</p>
                      </div>
                      <div className="max-w-md mx-auto space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>City</Label>
                            <Input placeholder="e.g. London" value={islamicSetup.city} onChange={e => setIslamicSetup(p => ({ ...p, city: e.target.value }))} className="h-11" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Country</Label>
                            <Input placeholder="e.g. UK" value={islamicSetup.country} onChange={e => setIslamicSetup(p => ({ ...p, country: e.target.value }))} className="h-11" />
                          </div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={detectLocation} disabled={detectingLocation}>
                          <MapPin className="w-4 h-4 mr-2" />
                          {detectingLocation ? 'Detecting...' : 'Auto-detect My Location'}
                        </Button>
                        <div className="space-y-1.5">
                          <Label>Prayer Calculation Method</Label>
                          <Select value={islamicSetup.prayer_method} onValueChange={v => setIslamicSetup(p => ({ ...p, prayer_method: v }))}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PRAYER_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button onClick={saveIslamicSetup} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                            Save & Continue <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                          <Button variant="ghost" onClick={handleStepComplete}>Skip</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep.component === 'questionnaire' && (
                    <WelcomeQuestionnaire
                      user={user}
                      onComplete={(data) => handleStepComplete(data)}
                      onSkip={handleSkip}
                    />
                  )}

                  {currentStep.component === 'features' && (
                    <div className="py-6">
                      <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        Powerful Features at Your Fingertips
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100"
                        >
                          <Brain className="w-10 h-10 text-purple-600 mb-3" />
                          <h4 className="font-bold text-lg text-slate-800 mb-2">AI Assistant</h4>
                          <p className="text-sm text-slate-600">
                            Smart event categorization, scheduling suggestions, and personalized calendar insights powered by AI.
                          </p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100"
                        >
                          <Moon className="w-10 h-10 text-teal-600 mb-3" />
                          <h4 className="font-bold text-lg text-slate-800 mb-2">Islamic Tools</h4>
                          <p className="text-sm text-slate-600">
                            Prayer times with Adhan, Quran reader, daily verses, Hijri calendar, Qibla finder, and comprehensive Ramadan tracking.
                          </p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                        >
                          <Calendar className="w-10 h-10 text-blue-600 mb-3" />
                          <h4 className="font-bold text-lg text-slate-800 mb-2">Smart Calendar</h4>
                          <p className="text-sm text-slate-600">
                            Multiple views, recurring events, conflict detection, external calendar sync, and collaborative event planning.
                          </p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100"
                        >
                          <Bell className="w-10 h-10 text-amber-600 mb-3" />
                          <h4 className="font-bold text-lg text-slate-800 mb-2">Smart Notifications</h4>
                          <p className="text-sm text-slate-600">
                            Intelligent reminders, prayer notifications, task alerts, and proactive suggestions based on your schedule.
                          </p>
                        </motion.div>
                      </div>

                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={handleStepComplete}
                          size="lg"
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                        >
                          Continue to Quick Tour
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button
                          onClick={handleSkip}
                          variant="outline"
                          size="lg"
                        >
                          Skip Tour
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep.component === 'features' && (
                    <div className="py-6">
                      <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        You're all set! Here's what awaits you 🎉
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {[
                          { icon: Brain, color: 'purple', title: 'AI Assistant', desc: 'Smart scheduling, event suggestions & personalized insights.' },
                          { icon: Moon, color: 'indigo', title: 'Islamic Tools', desc: 'Prayer times, Quran, Hijri calendar, Qibla & Ramadan tracker.' },
                          { icon: Calendar, color: 'teal', title: 'Smart Calendar', desc: 'Multiple views, conflict detection & Google Calendar sync.' },
                          { icon: Bell, color: 'amber', title: 'Smart Reminders', desc: 'Prayer alerts, task nudges & proactive AI notifications.' },
                        ].map(({ icon: Icon, color, title, desc }, i) => (
                          <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`p-5 bg-${color}-50 rounded-xl border border-${color}-100`}>
                            <Icon className={`w-9 h-9 text-${color}-600 mb-3`} />
                            <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
                            <p className="text-sm text-slate-600">{desc}</p>
                          </motion.div>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <Button onClick={handleStepComplete} size="lg" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-10">
                          Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
    </>
  );
}