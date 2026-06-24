import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Heart, Sparkles, Loader2, Calendar, Clock, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function AISmartDuaGenerator() {
  const [situation, setSituation] = useState('');
  const [duaType, setDuaType] = useState('general');
  const [generatedDua, setGeneratedDua] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: todayEvents = [] } = useQuery({
    queryKey: ['todayEvents'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.Event.filter({ start_date: today });
    }
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['weekEvents'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      return base44.entities.Event.list('start_date', 20);
    }
  });

  const generateDua = async () => {
    setLoading(true);
    try {
      const eventContext = duaType === 'event-based' 
        ? `Today's events: ${todayEvents.map(e => `${e.title} (${e.category})`).join(', ')}\nUpcoming: ${upcomingEvents.slice(0, 5).map(e => `${e.title} on ${format(new Date(e.start_date), 'MMM d')}`).join(', ')}`
        : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `As an Islamic scholar, generate an authentic and heartfelt dua (supplication) for the following situation.

SITUATION: ${situation || 'General well-being and guidance'}
DUA TYPE: ${duaType}
${eventContext ? `CALENDAR CONTEXT:\n${eventContext}` : ''}

Provide the dua in this format:
{
  "arabic_dua": "The dua in Arabic script (if it's from Quran/Hadith, otherwise a constructed Arabic dua)",
  "transliteration": "Arabic text in English letters for easy pronunciation",
  "translation": "Clear English translation",
  "source": "Source from Quran/Hadith if applicable, or 'General Islamic dua'",
  "context": "When and how to recite this dua",
  "related_verses": "Relevant Quranic verses that support this dua",
  "benefits": [
    "Spiritual benefit 1",
    "Spiritual benefit 2"
  ],
  "best_times": [
    "Optimal time to make this dua",
    "Another good time"
  ],
  "additional_actions": [
    "Complementary action 1",
    "Complementary action 2"
  ],
  "calendar_integration": {
    "suggested_events": [
      {
        "title": "Event title for calendar",
        "category": "prayer",
        "reminder_text": "Reminder to make this dua"
      }
    ]
  }
}

Ensure the dua is authentic, appropriate, and addresses their specific need.`,
        response_json_schema: {
          type: "object",
          properties: {
            arabic_dua: { type: "string" },
            transliteration: { type: "string" },
            translation: { type: "string" },
            source: { type: "string" },
            context: { type: "string" },
            related_verses: { type: "string" },
            benefits: { type: "array", items: { type: "string" } },
            best_times: { type: "array", items: { type: "string" } },
            additional_actions: { type: "array", items: { type: "string" } },
            calendar_integration: {
              type: "object",
              properties: {
                suggested_events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      category: { type: "string" },
                      reminder_text: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setGeneratedDua(response);
    } catch (error) {
      toast.error('Failed to generate dua');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const addToCalendar = async (event) => {
    try {
      await base44.entities.Event.create({
        title: event.title,
        category: event.category,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        is_all_day: true,
        notes: event.reminder_text,
        reminders: [{ minutes_before: 60, type: 'notification' }]
      });
      toast.success('Added reminder to calendar');
    } catch (error) {
      toast.error('Failed to add to calendar');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Heart className="w-5 h-5" />
          AI Smart Dua Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>What do you need dua for?</Label>
          <Textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="e.g., Starting a new job, health recovery, exam success, family harmony, or leave blank for general guidance"
            rows={3}
            className="bg-white mt-2"
          />
        </div>

        <div>
          <Label>Dua Type</Label>
          <Select value={duaType} onValueChange={setDuaType}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Guidance</SelectItem>
              <SelectItem value="event-based">Based on My Calendar</SelectItem>
              <SelectItem value="morning">Morning Dua</SelectItem>
              <SelectItem value="evening">Evening Dua</SelectItem>
              <SelectItem value="difficulty">In Times of Difficulty</SelectItem>
              <SelectItem value="gratitude">Expressing Gratitude</SelectItem>
              <SelectItem value="protection">Seeking Protection</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generateDua}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Dua...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Personalized Dua
            </>
          )}
        </Button>

        {generatedDua && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-6"
          >
            {/* Arabic Dua */}
            <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-purple-900">Arabic Text</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(generatedDua.arabic_dua)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-right text-2xl leading-loose font-arabic text-purple-900" dir="rtl">
                {generatedDua.arabic_dua}
              </p>
            </div>

            {/* Transliteration */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Transliteration</h4>
              <p className="text-sm text-blue-800 italic">{generatedDua.transliteration}</p>
            </div>

            {/* Translation */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <h4 className="font-semibold text-emerald-900 mb-2">Translation</h4>
              <p className="text-sm text-emerald-800">{generatedDua.translation}</p>
            </div>

            {/* Source & Context */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">📚 Source</h4>
                <p className="text-sm text-amber-800">{generatedDua.source}</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                <h4 className="font-semibold text-teal-900 mb-2">🕌 When to Recite</h4>
                <p className="text-sm text-teal-800">{generatedDua.context}</p>
              </div>
            </div>

            {/* Related Verses */}
            {generatedDua.related_verses && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <h4 className="font-semibold text-indigo-900 mb-2">📖 Related Verses</h4>
                <p className="text-sm text-indigo-800">{generatedDua.related_verses}</p>
              </div>
            )}

            {/* Benefits */}
            {generatedDua.benefits && generatedDua.benefits.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">✨ Spiritual Benefits</h4>
                <ul className="space-y-2">
                  {generatedDua.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-600" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Best Times */}
            {generatedDua.best_times && generatedDua.best_times.length > 0 && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <h4 className="font-semibold text-rose-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Best Times to Make This Dua
                </h4>
                <ul className="space-y-1">
                  {generatedDua.best_times.map((time, idx) => (
                    <li key={idx} className="text-sm text-rose-800">• {time}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Actions */}
            {generatedDua.additional_actions && generatedDua.additional_actions.length > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">🎯 Complementary Actions</h4>
                <ul className="space-y-2">
                  {generatedDua.additional_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                      <span className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-green-900">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calendar Integration */}
            {generatedDua.calendar_integration?.suggested_events && generatedDua.calendar_integration.suggested_events.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Add Reminder to Calendar
                </h4>
                <div className="space-y-2">
                  {generatedDua.calendar_integration.suggested_events.map((event, idx) => (
                    <Button
                      key={idx}
                      onClick={() => addToCalendar(event)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {event.title}
                    </Button>
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