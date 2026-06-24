import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, MapPin, Clock, AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DuaAudioPlayer from './DuaAudioPlayer';
import RitualVisualAid from './RitualVisualAid';

const RITUALS = [
  { value: 'tawaf', label: 'Tawaf (Circumambulation)' },
  { value: 'sai', label: "Sa'i (Walking between Safa & Marwa)" },
  { value: 'arafat', label: 'Arafat (Standing at Arafat)' },
  { value: 'muzdalifah', label: 'Muzdalifah (Night gathering)' },
  { value: 'mina', label: 'Mina (Encampment)' },
  { value: 'jamarat', label: 'Jamarat (Stoning of pillars)' }
];

export default function RitualGuidanceViewer() {
  const [selectedRitual, setSelectedRitual] = useState('tawaf');
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  const fetchGuidance = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('getHajjRitualGuidance', {
        ritual_type: selectedRitual,
        user_language: 'en',
        mobility_level: 'normal'
      });
      setGuidance(data);
      toast.success('Ritual guidance loaded!');
    } catch (error) {
      toast.error('Failed to load guidance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ritual Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Step-by-Step Ritual Guidance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedRitual} onValueChange={setSelectedRitual}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RITUALS.map(ritual => (
                  <SelectItem key={ritual.value} value={ritual.value}>
                    {ritual.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchGuidance} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Load Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guidance Display */}
      {guidance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Overview */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">{guidance.ritual?.charAt(0).toUpperCase() + guidance.ritual?.slice(1) || 'Ritual'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Overview</h3>
                <p className="text-sm text-blue-800">{guidance.overview}</p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Spiritual Significance</h3>
                <p className="text-sm text-blue-800">{guidance.spiritual_significance}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-2 bg-white rounded">
                  <p className="text-xs text-slate-600">Estimated Duration</p>
                  <p className="font-semibold text-sm">{guidance.estimated_duration}</p>
                </div>
                <div className="p-2 bg-white rounded">
                  <p className="text-xs text-slate-600">Difficulty Level</p>
                  <Badge variant="outline" className="text-xs">Guided</Badge>
                </div>
              </div>

              {/* Visual Aids Section */}
              <div className="pt-3 border-t border-blue-300">
                <RitualVisualAid ritualType={selectedRitual} />
              </div>
            </CardContent>
          </Card>

          {/* Prerequisites */}
          {guidance.prerequisites?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Before You Start</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guidance.prerequisites.map((item, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Step by Step */}
          {guidance.step_by_step_guide?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Step-by-Step Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guidance.step_by_step_guide.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <button
                      onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold">
                              {step.step}
                            </div>
                            <span className="font-semibold text-slate-900">{step.title}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 ml-8 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {step.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {expandedStep === idx && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 ml-8 p-3 bg-blue-50 rounded-lg space-y-3 border-l-2 border-blue-300"
                      >
                        <p className="text-sm text-slate-700">{step.description}</p>

                        {step.key_points?.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm text-slate-800 mb-2">Key Points</p>
                            <ul className="space-y-1">
                              {step.key_points.map((point, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-1.5" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.common_mistakes?.length > 0 && (
                          <div className="p-2 bg-amber-100 rounded">
                            <p className="font-semibold text-xs text-amber-900 mb-1">Common Mistakes</p>
                            <ul className="space-y-1">
                              {step.common_mistakes.map((mistake, i) => (
                                <li key={i} className="text-xs text-amber-800">⚠️ {mistake}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.accessibility_note && (
                          <div className="p-2 bg-green-100 rounded text-xs text-green-800">
                            ♿ {step.accessibility_note}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Important Rules */}
          {guidance.important_rules?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  Important Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guidance.important_rules.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <p className="font-semibold text-sm text-red-900">{rule.rule}</p>
                    <p className="text-xs text-red-800 mt-1">If broken: {rule.consequence}</p>
                    <p className="text-xs text-red-700 mt-1">✓ How to comply: {rule.how_to_comply}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Duas with Audio & Interactive Transliteration */}
          {guidance.duas?.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-base">🤲 Recommended Duas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {guidance.duas.map((dua, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-white rounded border border-emerald-200"
                  >
                    <DuaAudioPlayer dua={dua} duaText={dua.arabic} />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Safety & Crowd Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guidance.safety_tips?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Safety Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {guidance.safety_tips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-slate-700">🛡️ {tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {guidance.crowd_management?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Crowd Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {guidance.crowd_management.map((tip, idx) => (
                      <li key={idx} className="text-xs text-slate-700">👥 {tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}