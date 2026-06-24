import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart, Brain, Sparkles, Loader2, BookOpen, Lightbulb, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PrayerMindfulnessGuide() {
  const [personalizedGuidance, setPersonalizedGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusArea, setFocusArea] = useState('khushoo');

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 30)
  });

  const getPersonalizedGuidance = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide personalized Islamic guidance on improving prayer focus and mindfulness (Khushoo).

Focus area: ${focusArea}

Include:
1. **Understanding**: Brief explanation of the importance in Islam
2. **Common Challenges**: 3 common struggles Muslims face
3. **Practical Techniques**: 5 specific, actionable techniques to improve
4. **Du'as**: 2 relevant duas for focus and concentration
5. **Quranic Reminder**: A relevant verse about prayer focus
6. **Daily Practice**: A simple daily exercise to build mindfulness
7. **Signs of Improvement**: How to know you're making progress

Be practical, Islamic, and encouraging. Reference authentic sources where appropriate.`,
        response_json_schema: {
          type: "object",
          properties: {
            understanding: { type: "string" },
            common_challenges: {
              type: "array",
              items: { type: "string" }
            },
            practical_techniques: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            duas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  arabic: { type: "string" },
                  transliteration: { type: "string" },
                  translation: { type: "string" }
                }
              }
            },
            quranic_reminder: {
              type: "object",
              properties: {
                verse: { type: "string" },
                reference: { type: "string" },
                context: { type: "string" }
              }
            },
            daily_practice: { type: "string" },
            signs_of_improvement: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setPersonalizedGuidance(result);
      toast.success('Guidance ready!');
    } catch (error) {
      toast.error('Failed to get guidance');
    } finally {
      setLoading(false);
    }
  };

  const focusAreas = [
    { id: 'khushoo', label: 'Khushoo (Focus)', icon: Heart },
    { id: 'concentration', label: 'Concentration', icon: Brain },
    { id: 'understanding', label: 'Understanding', icon: BookOpen }
  ];

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-600" />
              Prayer Mindfulness Guide
            </CardTitle>
            <CardDescription>
              Improve focus, concentration, and connection in prayer
            </CardDescription>
          </div>
          <Button
            onClick={getPersonalizedGuidance}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Guidance
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Focus Area Selection */}
        <div className="flex gap-2 mb-4">
          {focusAreas.map((area) => {
            const Icon = area.icon;
            return (
              <button
                key={area.id}
                onClick={() => setFocusArea(area.id)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  focusArea === area.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <p className="text-xs font-medium">{area.label}</p>
              </button>
            );
          })}
        </div>

        {!personalizedGuidance ? (
          <div className="text-center py-8">
            <p className="text-slate-600 mb-4">
              Select a focus area and get personalized Islamic guidance
            </p>
            <div className="grid gap-3">
              <div className="p-4 bg-white rounded-lg border border-teal-200">
                <h4 className="font-semibold text-sm text-teal-900 mb-2">💚 Khushoo (Focus)</h4>
                <p className="text-xs text-slate-600">Learn techniques to achieve deep presence in prayer</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-teal-200">
                <h4 className="font-semibold text-sm text-teal-900 mb-2">🧠 Concentration</h4>
                <p className="text-xs text-slate-600">Overcome distractions and maintain focus</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-teal-200">
                <h4 className="font-semibold text-sm text-teal-900 mb-2">📖 Understanding</h4>
                <p className="text-xs text-slate-600">Deepen your understanding of what you recite</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Understanding */}
            <div className="p-4 bg-white rounded-lg border-2 border-teal-300">
              <h4 className="font-semibold text-teal-900 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Understanding the Importance
              </h4>
              <p className="text-sm text-slate-700">{personalizedGuidance.understanding}</p>
            </div>

            {/* Quranic Reminder */}
            {personalizedGuidance.quranic_reminder && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-300">
                <h4 className="font-semibold text-emerald-900 mb-2">📖 Quranic Guidance</h4>
                <p className="text-sm text-emerald-800 italic mb-1">"{personalizedGuidance.quranic_reminder.verse}"</p>
                <p className="text-xs text-emerald-700">— {personalizedGuidance.quranic_reminder.reference}</p>
                <p className="text-xs text-slate-600 mt-2">{personalizedGuidance.quranic_reminder.context}</p>
              </div>
            )}

            {/* Practical Techniques */}
            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                Practical Techniques
              </h4>
              <div className="space-y-3">
                {personalizedGuidance.practical_techniques?.map((technique, i) => (
                  <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h5 className="font-medium text-sm text-purple-900 mb-1">
                      {i + 1}. {technique.title}
                    </h5>
                    <p className="text-xs text-slate-600">{technique.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Duas for Focus */}
            {personalizedGuidance.duas && personalizedGuidance.duas.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">🤲 Du'as for Concentration</h4>
                <div className="space-y-3">
                  {personalizedGuidance.duas.map((dua, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg">
                      {dua.arabic && (
                        <p className="text-right text-lg font-arabic text-blue-900 mb-2" dir="rtl">
                          {dua.arabic}
                        </p>
                      )}
                      {dua.transliteration && (
                        <p className="text-sm text-slate-600 italic mb-1">{dua.transliteration}</p>
                      )}
                      <p className="text-sm text-slate-700">{dua.translation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Practice */}
            {personalizedGuidance.daily_practice && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
                <h4 className="font-semibold text-amber-900 mb-2">🎯 Daily Practice</h4>
                <p className="text-sm text-amber-800">{personalizedGuidance.daily_practice}</p>
              </div>
            )}

            {/* Signs of Improvement */}
            {personalizedGuidance.signs_of_improvement && (
              <div className="p-4 bg-white rounded-lg">
                <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Signs You're Improving
                </h4>
                <ul className="space-y-1">
                  {personalizedGuidance.signs_of_improvement.map((sign, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}