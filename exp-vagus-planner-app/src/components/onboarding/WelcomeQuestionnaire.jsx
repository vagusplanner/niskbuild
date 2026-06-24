import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, ChevronRight, Check, MapPin, 
  Briefcase, Heart, Calendar, Moon, Coffee, X, Clock
} from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import ImprovedOnboardingResults from './ImprovedOnboardingResults';

const WORK_STYLES = [
  { id: 'early-bird', label: 'Early Bird', desc: 'Best work 6am-12pm', icon: '🌅' },
  { id: 'night-owl', label: 'Night Owl', desc: 'Best work 6pm-12am', icon: '🦉' },
  { id: 'flexible', label: 'Flexible', desc: 'No preference', icon: '🔄' }
];

const FOCUS_AREAS = [
  { id: 'work', label: 'Work & Career', icon: Briefcase, color: 'bg-blue-100 text-blue-700' },
  { id: 'health', label: 'Health & Fitness', icon: Heart, color: 'bg-red-100 text-red-700' },
  { id: 'personal', label: 'Personal Growth', icon: Sparkles, color: 'bg-purple-100 text-purple-700' },
  { id: 'family', label: 'Family & Social', icon: Calendar, color: 'bg-green-100 text-green-700' },
  { id: 'spiritual', label: 'Spiritual', icon: Moon, color: 'bg-indigo-100 text-indigo-700' }
];

const TRAVEL_INTERESTS = [
  'Adventure', 'Culture', 'Food', 'Nature', 'History', 'Shopping', 'Beach', 'Mountains'
];

const DIETARY_PREFS = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Keto', 'Paleo'
];

export default function WelcomeQuestionnaire({ user, onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    location_city: '',
    location_country: '',
    work_style: '',
    focus_areas: [],
    prayer_enabled: true,
    prayer_method: 'MWL',
    travel_interests: [],
    dietary_preferences: [],
    period_tracker_enabled: false
  });

  const toggleArray = (array, item) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleSubmit = async () => {
    try {
      // Get coordinates for location
      let coords = {};
      if (formData.location_city && formData.location_country) {
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${formData.location_city}&country=${formData.location_country}&format=json&limit=1`
          );
          const geoData = await geoResponse.json();
          if (geoData[0]) {
            coords = {
              latitude: parseFloat(geoData[0].lat),
              longitude: parseFloat(geoData[0].lon)
            };
          }
        } catch (error) {
          console.error('Geocoding failed:', error);
        }
      }

      // Check if settings already exist
      const existingSettings = await SDK.entities.UserSettings.list();
      
      const settingsData = {
        ...formData,
        ...coords,
        onboarding_completed: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      let settings;
      if (existingSettings.length > 0) {
        // Update existing settings
        settings = await SDK.entities.UserSettings.update(existingSettings[0].id, settingsData);
      } else {
        // Create new settings
        settings = await SDK.entities.UserSettings.create(settingsData);
      }

      // Get current user for email
      const currentUser = await SDK.auth.me();

      // Show AI-powered results with user info for email
      const finalData = {
        ...formData,
        user_email: currentUser.email,
        user_name: currentUser.full_name
      };
      setFormData(finalData);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  if (showResults) {
    return (
      <ImprovedOnboardingResults 
        onboardingData={formData} 
        onComplete={() => {
          toast.success('Welcome! Your personalized setup is complete.');
          // Pass focus_areas back so the tour can personalise
          onComplete({ focus_areas: formData.focus_areas });
        }} 
      />
    );
  }

  const steps = [
    {
      title: 'Where are you located?',
      subtitle: 'For prayer times and timezone settings',
      icon: MapPin,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.location_city}
              onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
              placeholder="e.g., London"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.location_country}
              onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
              placeholder="e.g., United Kingdom"
              className="mt-2"
            />
          </div>
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Prayer Times</Label>
                <p className="text-xs text-slate-500">Display Islamic prayer times in calendar</p>
              </div>
              <Button
                type="button"
                variant={formData.prayer_enabled ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData({ ...formData, prayer_enabled: !formData.prayer_enabled })}
                className={formData.prayer_enabled ? 'bg-teal-600' : ''}
              >
                {formData.prayer_enabled ? 'Yes' : 'No'}
              </Button>
            </div>
            {formData.prayer_enabled && (
              <div>
                <Label className="text-sm mb-2 block">Prayer Calculation Method</Label>
                <select
                  value={formData.prayer_method}
                  onChange={(e) => setFormData({ ...formData, prayer_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="MWL">Muslim World League</option>
                  <option value="ISNA">Islamic Society of North America</option>
                  <option value="Egypt">Egyptian General Authority</option>
                  <option value="Makkah">Umm Al-Qura (Makkah)</option>
                  <option value="Karachi">University of Islamic Sciences, Karachi</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'When do you work best?',
      subtitle: 'Help us schedule tasks at optimal times',
      icon: Coffee,
      content: (
        <div className="space-y-3">
          {WORK_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setFormData({ ...formData, work_style: style.id })}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                formData.work_style === style.id
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{style.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{style.label}</p>
                  <p className="text-sm text-slate-600">{style.desc}</p>
                </div>
                {formData.work_style === style.id && (
                  <Check className="w-5 h-5 text-teal-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'What are your focus areas?',
      subtitle: 'Select all that apply',
      icon: Briefcase,
      content: (
        <div className="space-y-3">
          {FOCUS_AREAS.map(area => {
            const Icon = area.icon;
            const isSelected = formData.focus_areas.includes(area.id);
            return (
              <button
                key={area.id}
                onClick={() => setFormData({
                  ...formData,
                  focus_areas: toggleArray(formData.focus_areas, area.id)
                })}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${area.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-slate-800">{area.label}</span>
                  {isSelected && (
                    <Check className="w-5 h-5 text-teal-600 ml-auto" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )
    },
    {
      title: 'Travel & Lifestyle',
      subtitle: 'Help us suggest relevant events',
      icon: MapPin,
      content: (
        <div className="space-y-6">
          <div>
            <Label className="mb-3 block">Travel Interests</Label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  onClick={() => setFormData({
                    ...formData,
                    travel_interests: toggleArray(formData.travel_interests, interest)
                  })}
                  className={`cursor-pointer ${
                    formData.travel_interests.includes(interest)
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-3 block">Dietary Preferences</Label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFS.map(pref => (
                <Badge
                  key={pref}
                  onClick={() => setFormData({
                    ...formData,
                    dietary_preferences: toggleArray(formData.dietary_preferences, pref)
                  })}
                  className={`cursor-pointer ${
                    formData.dietary_preferences.includes(pref)
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {pref}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
      onClick={(e) => {
        // Allow clicking backdrop to skip
        if (e.target === e.currentTarget) {
          onSkip();
        }
      }}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[151] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currentStep.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{currentStep.subtitle}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSkip();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 z-20 relative touch-manipulation flex-shrink-0 pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  idx < step ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (step === 1) {
                  onSkip();
                } else {
                  setStep(step - 1);
                }
              }}
              className="z-20 relative touch-manipulation min-h-[48px] px-6 pointer-events-auto"
            >
              {step === 1 ? 'Skip Setup' : 'Back'}
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (step === steps.length) {
                  handleSubmit();
                } else {
                  setStep(step + 1);
                }
              }}
              className="bg-teal-600 hover:bg-teal-700 z-20 relative touch-manipulation min-h-[48px] px-6 pointer-events-auto"
            >
              {step === steps.length ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}