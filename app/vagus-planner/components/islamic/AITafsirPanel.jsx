import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen, Sparkles, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AITafsirPanel() {
  const [surahNumber, setSurahNumber] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [tafsir, setTafsir] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['recentEvents'],
    queryFn: () => base44.entities.Event.list('-start_date', 5)
  });

  const userSettings = settings[0] || {};

  const generateTafsir = async () => {
    if (!surahNumber || !verseNumber) {
      toast.error('Please enter Surah and Verse numbers');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide a personalized Quranic tafsir (explanation) for the following verse, considering the user's context and interests.

VERSE REFERENCE:
- Surah: ${surahNumber}
- Verse: ${verseNumber}

USER CONTEXT:
- Focus Areas: ${userSettings.focus_areas?.join(', ') || 'Not specified'}
- Interests: ${userSettings.ai_interest_areas?.join(', ') || 'General'}
- Recent Life Events: ${recentEvents.map(e => e.title).join(', ') || 'None'}
${customQuery ? `- Specific Question: ${customQuery}` : ''}

Please provide a comprehensive tafsir in this format:
{
  "verse_text": "The verse in English translation",
  "arabic_text": "Arabic text if known",
  "classical_interpretation": "Brief classical tafsir from scholars",
  "personalized_insights": [
    "Insight relevant to their focus areas",
    "Another personalized insight",
    "Practical application insight"
  ],
  "contextual_relevance": "How this verse relates to their current interests/situation",
  "scholarly_references": ["Brief reference to classical scholars"],
  "practical_actions": [
    "Actionable step 1",
    "Actionable step 2"
  ],
  "reflection_questions": [
    "Question to ponder",
    "Another reflection prompt"
  ],
  "related_verses": [
    {"surah": number, "verse": number, "relevance": "why it's related"}
  ],
  "daily_application": "How to apply this verse today"
}

Make it deeply personal, scholarly, and actionable. Connect it to their life context.`,
        response_json_schema: {
          type: "object",
          properties: {
            verse_text: { type: "string" },
            arabic_text: { type: "string" },
            classical_interpretation: { type: "string" },
            personalized_insights: { type: "array", items: { type: "string" } },
            contextual_relevance: { type: "string" },
            scholarly_references: { type: "array", items: { type: "string" } },
            practical_actions: { type: "array", items: { type: "string" } },
            reflection_questions: { type: "array", items: { type: "string" } },
            related_verses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  surah: { type: "number" },
                  verse: { type: "number" },
                  relevance: { type: "string" }
                }
              }
            },
            daily_application: { type: "string" }
          }
        }
      });

      setTafsir(response);
    } catch (error) {
      toast.error('Failed to generate tafsir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <BookOpen className="w-5 h-5" />
          AI-Powered Personalized Tafsir
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Surah Number</Label>
            <Input
              type="number"
              min="1"
              max="114"
              value={surahNumber}
              onChange={(e) => setSurahNumber(e.target.value)}
              placeholder="e.g., 2"
            />
          </div>
          <div>
            <Label>Verse Number</Label>
            <Input
              type="number"
              min="1"
              value={verseNumber}
              onChange={(e) => setVerseNumber(e.target.value)}
              placeholder="e.g., 255"
            />
          </div>
        </div>

        <div>
          <Label>Specific Question (Optional)</Label>
          <Textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="e.g., How does this verse relate to my work challenges?"
            rows={2}
          />
        </div>

        <Button
          onClick={generateTafsir}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Tafsir...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Personalized Tafsir
            </>
          )}
        </Button>

        {tafsir && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-6"
          >
            {/* Verse Display */}
            {tafsir.arabic_text && (
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
                <p className="text-right text-2xl leading-loose font-arabic text-blue-900" dir="rtl">
                  {tafsir.arabic_text}
                </p>
              </div>
            )}

            <div className="p-4 bg-white rounded-xl">
              <p className="text-slate-700 leading-relaxed">{tafsir.verse_text}</p>
            </div>

            {/* Classical Interpretation */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">📚 Classical Tafsir</h4>
              <p className="text-sm text-amber-800">{tafsir.classical_interpretation}</p>
              {tafsir.scholarly_references && (
                <div className="mt-2 text-xs text-amber-700">
                  <span className="font-medium">References: </span>
                  {tafsir.scholarly_references.join(', ')}
                </div>
              )}
            </div>

            {/* Personalized Insights */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">💡 Personalized for You</h4>
              <ul className="space-y-2">
                {tafsir.personalized_insights?.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-600" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contextual Relevance */}
            {tafsir.contextual_relevance && (
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                <h4 className="font-semibold text-teal-900 mb-2">🎯 How This Relates to You</h4>
                <p className="text-sm text-teal-800">{tafsir.contextual_relevance}</p>
              </div>
            )}

            {/* Practical Actions */}
            {tafsir.practical_actions && tafsir.practical_actions.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <h4 className="font-semibold text-emerald-900 mb-3">✅ Actionable Steps</h4>
                <ul className="space-y-2">
                  {tafsir.practical_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-900">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Daily Application */}
            {tafsir.daily_application && (
              <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Apply Today
                </h4>
                <p className="text-sm text-blue-50">{tafsir.daily_application}</p>
              </div>
            )}

            {/* Reflection Questions */}
            {tafsir.reflection_questions && tafsir.reflection_questions.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">💭 Reflect On</h4>
                {tafsir.reflection_questions.map((q, idx) => (
                  <p key={idx} className="text-sm text-slate-700 mb-2">• {q}</p>
                ))}
              </div>
            )}

            {/* Related Verses */}
            {tafsir.related_verses && tafsir.related_verses.length > 0 && (
              <div className="p-4 bg-white rounded-xl border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">🔗 Related Verses</h4>
                <div className="space-y-2">
                  {tafsir.related_verses.map((rv, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSurahNumber(String(rv.surah));
                        setVerseNumber(String(rv.verse));
                      }}
                      className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">
                          Surah {rv.surah}:{rv.verse}
                        </span>
                        <Search className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs text-blue-700 mt-1">{rv.relevance}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}