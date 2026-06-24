import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BookMarked, Heart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const RITUALS = ['Tawaf', 'Sai', 'Arafat', 'Muzdalifah', 'Mina', 'Jamarat'];
const EMOTIONS = ['inspired', 'grateful', 'peaceful', 'challenged', 'overwhelmed', 'connected'];

export default function DailySummaryGenerator() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    rituals_completed: [],
    activities: [],
    reflections: '',
    challenges_faced: [],
    health_status: 'good',
    emotional_state: 'inspired'
  });

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('generatePilgrimageDailySummary', formData);
      setSummary(data);
      toast.success('Daily summary generated!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const toggleRitual = (ritual) => {
    setFormData(prev => ({
      ...prev,
      rituals_completed: prev.rituals_completed.includes(ritual)
        ? prev.rituals_completed.filter(r => r !== ritual)
        : [...prev.rituals_completed, ritual]
    }));
  };

  return (
    <div className="space-y-4">
      {!summary ? (
        <>
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-indigo-600" />
                Log Your Daily Pilgrimage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full mt-1 p-2 border rounded"
                />
              </div>

              {/* Rituals Completed */}
              <div>
                <label className="text-sm font-medium mb-2 block">Rituals Completed</label>
                <div className="flex flex-wrap gap-2">
                  {RITUALS.map(ritual => (
                    <button
                      key={ritual}
                      onClick={() => toggleRitual(ritual)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.rituals_completed.includes(ritual)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {ritual}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotional State */}
              <div>
                <label className="text-sm font-medium mb-2 block">How did you feel today?</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONS.map(emotion => (
                    <button
                      key={emotion}
                      onClick={() => setFormData({ ...formData, emotional_state: emotion })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.emotional_state === emotion
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health Status */}
              <div>
                <label className="text-sm font-medium mb-2 block">Health Status</label>
                <select
                  value={formData.health_status}
                  onChange={e => setFormData({ ...formData, health_status: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                </select>
              </div>

              {/* Reflections */}
              <div>
                <label className="text-sm font-medium mb-2 block">Personal Reflections</label>
                <Textarea
                  placeholder="Share your thoughts, experiences, and what you learned today..."
                  value={formData.reflections}
                  onChange={e => setFormData({ ...formData, reflections: e.target.value })}
                  className="h-24"
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="text-sm font-medium mb-2 block">Challenges Faced (optional)</label>
                <Textarea
                  placeholder="Any physical, emotional, or spiritual challenges you faced..."
                  value={formData.challenges_faced.join('\n')}
                  onChange={e => setFormData({
                    ...formData,
                    challenges_faced: e.target.value.split('\n').filter(c => c.trim())
                  })}
                  className="h-16"
                />
              </div>

              <Button
                onClick={generateSummary}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Title */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold text-indigo-900 mb-2">{summary.day_title}</h2>
              <p className="text-sm text-indigo-700">{summary.date}</p>
            </CardContent>
          </Card>

          {/* Spiritual Reflection */}
          {summary.spiritual_reflection && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-600" />
                  Spiritual Reflection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-800 leading-relaxed italic">{summary.spiritual_reflection}</p>
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {summary.achievements?.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-base">Today's Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.achievements.map((achievement, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded">
                    <h4 className="font-semibold text-green-900">{achievement.ritual_or_activity}</h4>
                    <p className="text-xs text-green-800 mt-1"><strong>Significance:</strong> {achievement.significance}</p>
                    <p className="text-xs text-slate-700 mt-1">{achievement.experience_summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Emotional Journey */}
          {summary.emotional_journey && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-base">Emotional Journey</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-900">{summary.emotional_journey}</p>
              </CardContent>
            </Card>
          )}

          {/* Challenges & Lessons */}
          {summary.challenges_and_lessons?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Challenges & Lessons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.challenges_and_lessons.map((item, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm font-semibold text-amber-900">Challenge: {item.challenge}</p>
                    <p className="text-xs text-amber-800 mt-1">💡 Lesson: {item.lesson_learned}</p>
                    <p className="text-xs text-slate-700 mt-1">Next time: {item.advice_for_next_time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {summary.highlights?.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-base">Key Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {summary.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-yellow-500">⭐</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Health & Wellness */}
          {summary.health_and_wellness && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Health & Wellness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-800">{summary.health_and_wellness.status_summary}</p>
                {summary.health_and_wellness.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Recommendations:</p>
                    <ul className="space-y-1">
                      {summary.health_and_wellness.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-slate-700">✓ {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress Report */}
          {summary.progress_report && (
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-base">Progress Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-600">Rituals Completed</p>
                    <p className="font-semibold text-lg">{summary.progress_report.rituals_completed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Spiritual Connection</p>
                    <Badge variant="outline">{summary.progress_report.connection_to_the_sacred}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Day Preparation */}
          {summary.next_day_preparation && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-base">Prepare for Tomorrow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-emerald-900">{summary.next_day_preparation}</p>
              </CardContent>
            </Card>
          )}

          {/* Gratitude */}
          {summary.gratitude_reminder && (
            <Card className="border-rose-200 bg-rose-50">
              <CardContent className="pt-6">
                <p className="text-sm text-rose-900 italic text-center font-medium">{summary.gratitude_reminder}</p>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => {
              setSummary(null);
              setFormData({
                date: new Date().toISOString().split('T')[0],
                rituals_completed: [],
                activities: [],
                reflections: '',
                challenges_faced: [],
                health_status: 'good',
                emotional_state: 'inspired'
              });
            }}
            variant="outline"
            className="w-full"
          >
            Create Another Summary
          </Button>
        </motion.div>
      )}
    </div>
  );
}