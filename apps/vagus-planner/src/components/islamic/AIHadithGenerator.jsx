import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIHadithGenerator() {
  const [interests, setInterests] = useState('');
  const [challenges, setChallenges] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedHadith, setExpandedHadith] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const { data: hadiths = [] } = useQuery({
    queryKey: ['personalizedHadiths'],
    queryFn: () => base44.entities.Hadith.list('-created_date', 10),
    initialData: []
  });

  const handleGenerate = async () => {
    setLoading(true);
    
    try {
      const result = await base44.functions.invoke('generatePersonalizedIslamicContent', {
        content_type: 'hadith_explanation',
        context: {
          interests: interests.split(',').map(i => i.trim()).filter(i => i),
          challenges: challenges || undefined
        }
      });

      // Save generated Hadiths to database
      const hadiths = result.data.content.hadiths || [];
      for (const hadith of hadiths) {
        await base44.entities.Hadith.create({
          title: hadith.title,
          translation: hadith.translation,
          collection: hadith.collection,
          narrator: hadith.narrator,
          ai_context: hadith.ai_context,
          notes: JSON.stringify(hadith.ai_context)
        });
      }

      toast.success(`Generated ${hadiths.length} Hadiths connected to your life!`);
      queryClient.invalidateQueries({ queryKey: ['personalizedHadiths'] });
      setInterests('');
      setChallenges('');
    } catch (error) {
      toast.error('Failed to generate Hadiths. Please try again.');
      console.error('Hadith generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseAiContext = (hadith) => {
    try {
      return hadith.ai_context || JSON.parse(hadith.notes || '{}');
    } catch {
      return {};
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            AI Hadith Guidance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What topics interest you? (comma-separated)</Label>
            <Input
              placeholder="e.g., patience, gratitude, family, knowledge"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Current life challenges (optional)</Label>
            <Input
              placeholder="e.g., work stress, family issues, health concerns"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !interests.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Personalized Hadiths
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {hadiths.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">Your Personalized Hadiths</h3>
          <AnimatePresence>
            {hadiths.map((hadith, idx) => {
              const context = parseAiContext(hadith);
              const isExpanded = expandedHadith === hadith.id;

              return (
                <motion.div
                  key={hadith.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border-amber-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 mb-1">{hadith.title || 'Hadith'}</h4>
                          <Badge variant="outline" className="mb-2">{hadith.collection}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedHadith(isExpanded ? null : hadith.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      <p className="text-slate-700 leading-relaxed italic">
                        "{hadith.translation}"
                      </p>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t"
                        >
                          {context.explanation && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Explanation</p>
                              <p className="text-sm text-blue-800">{context.explanation}</p>
                            </div>
                          )}

                          {context.key_teachings && context.key_teachings.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-2">Key Teachings</p>
                              <ul className="space-y-1">
                                {context.key_teachings.map((teaching, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="text-amber-600">✦</span>
                                    <span>{teaching}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {context.practical_steps && context.practical_steps.length > 0 && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs font-semibold text-green-900 mb-2">Action Steps</p>
                              {context.practical_steps.map((step, i) => (
                                <p key={i} className="text-sm text-green-800 mb-1">
                                  {i + 1}. {step}
                                </p>
                              ))}
                            </div>
                          )}

                          {context.relevance_to_user && (
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs font-semibold text-purple-900 mb-1">Why This Matters to You</p>
                              <p className="text-sm text-purple-800">{context.relevance_to_user}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}