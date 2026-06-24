import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const SPIRITUAL_FOCUSES = [
  'Prayer & Worship',
  'Islamic History',
  'Quranic Reflection',
  'Community Service',
  'Health & Wellness',
  'Family Bonding'
];

const INTERESTS = [
  'Historical Sites',
  'Archaeological Sites',
  'Museum Visits',
  'Local Markets',
  'Photography',
  'Fitness Activities'
];

const ACCESSIBILITY_NEEDS = [
  'Wheelchair Access',
  'Mobility Assistance',
  'Medical Support',
  'Climate Controlled Areas',
  'Prayer Space Proximity',
  'Dietary Accommodations'
];

export default function PilgrimagePlanPreferences({ onGeneratePlan, isLoading }) {
  const [pilgrimageType, setPilgrimageType] = useState('hajj');
  const [durationDays, setDurationDays] = useState(14);
  const [budgetUSD, setBudgetUSD] = useState(5000);
  const [mobilityLevel, setMobilityLevel] = useState('normal');
  const [groupSize, setGroupSize] = useState(1);
  const [preferredPace, setPreferredPace] = useState('moderate');
  const [spiritualFocus, setSpiritualFocus] = useState([]);
  const [interests, setInterests] = useState([]);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState([]);

  const handleToggleSpiritual = (focus) => {
    setSpiritualFocus(prev =>
      prev.includes(focus) ? prev.filter(f => f !== focus) : [...prev, focus]
    );
  };

  const handleToggleInterest = (interest) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleToggleAccessibility = (need) => {
    setAccessibilityNeeds(prev =>
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  };

  const handleGenerate = () => {
    onGeneratePlan({
      pilgrimage_type: pilgrimageType,
      duration_days: durationDays,
      budget_usd: budgetUSD,
      mobility_level: mobilityLevel,
      group_size: groupSize,
      preferred_pace: preferredPace,
      spiritual_focus: spiritualFocus,
      interests: interests,
      accessibility_needs: accessibilityNeeds
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-3 block">
              Pilgrimage Type
            </label>
            <div className="flex gap-2">
              {['hajj', 'umrah'].map(type => (
                <button
                  key={type}
                  onClick={() => setPilgrimageType(type)}
                  className={`px-4 py-2 rounded-lg border-2 font-semibold capitalize transition-all ${
                    pilgrimageType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-900">
                Duration: {durationDays} days
              </label>
              <span className="text-xs text-slate-600">5-30 days</span>
            </div>
            <Slider
              value={[durationDays]}
              onValueChange={(val) => setDurationDays(val[0])}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-900">
                Budget: ${budgetUSD.toLocaleString()}
              </label>
              <span className="text-xs text-slate-600">$2000-$15000</span>
            </div>
            <Slider
              value={[budgetUSD]}
              onValueChange={(val) => setBudgetUSD(val[0])}
              min={2000}
              max={15000}
              step={500}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-2">
                Group Size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-2">
                Mobility Level
              </label>
              <select
                value={mobilityLevel}
                onChange={(e) => setMobilityLevel(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="limited">Limited</option>
                <option value="normal">Normal</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900 block mb-2">
              Preferred Pace
            </label>
            <div className="flex gap-2">
              {['relaxed', 'moderate', 'active'].map(pace => (
                <button
                  key={pace}
                  onClick={() => setPreferredPace(pace)}
                  className={`px-3 py-1 text-xs rounded border capitalize transition-all ${
                    preferredPace === pace
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  {pace}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spiritual Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spiritual Focus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SPIRITUAL_FOCUSES.map(focus => (
              <button
                key={focus}
                onClick={() => handleToggleSpiritual(focus)}
                className={`px-3 py-1.5 text-xs rounded-full transition-all border ${
                  spiritualFocus.includes(focus)
                    ? 'border-emerald-600 bg-emerald-100 text-emerald-700 font-semibold'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-300'
                }`}
              >
                {spiritualFocus.includes(focus) && <Check className="w-3 h-3 inline mr-1" />}
                {focus}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interests & Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => handleToggleInterest(interest)}
                className={`px-3 py-1.5 text-xs rounded-full transition-all border ${
                  interests.includes(interest)
                    ? 'border-blue-600 bg-blue-100 text-blue-700 font-semibold'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {interests.includes(interest) && <Check className="w-3 h-3 inline mr-1" />}
                {interest}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Needs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accessibility Needs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ACCESSIBILITY_NEEDS.map(need => (
              <div key={need} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={need}
                  checked={accessibilityNeeds.includes(need)}
                  onChange={() => handleToggleAccessibility(need)}
                  className="rounded"
                />
                <Label htmlFor={need} className="text-sm cursor-pointer">
                  {need}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-10 font-semibold text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating Your Plan...
          </>
        ) : (
          <>
            ✨ Generate Personalized Plan
          </>
        )}
      </Button>
    </motion.div>
  );
}