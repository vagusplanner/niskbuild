import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, BookOpen, Moon, Heart, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AILifestyleSuggestions({ onClose, onAcceptSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 8 personalized Islamic daily routine suggestions. Include:
1. Surah Al-Kahf on Friday (MUST include)
2. Dhikr after Fajr (33x SubhanAllah, Alhamdulillah, Allahu Akbar)
3. Dhikr after Isha
4. Morning adhkar after Fajr
5. Evening adhkar after Maghrib
6. Dua before sleeping
7. Quran reading daily
8. One lifestyle habit (charity, family time, learning)

For each, provide:
- title: Short descriptive title
- description: Brief explanation
- routine_type: (quran_reading, dhikr, dua, tasbih, prayer_sunnah, charity, learning, fitness, family_time)
- target_time: (after_fajr, after_dhuhr, after_asr, after_maghrib, after_isha, before_sleep, friday_only, anytime)
- frequency: (daily, friday_only, weekends, weekdays)
- target_count: number if applicable (e.g., 33 for tasbih, 100 for dhikr)
- category: "Essential" or "Recommended"`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  routine_type: { type: "string" },
                  target_time: { type: "string" },
                  frequency: { type: "string" },
                  target_count: { type: "number" },
                  category: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    generateSuggestions();
  }, []);

  const getIcon = (type) => {
    const icons = {
      quran_reading: <BookOpen className="w-5 h-5 text-teal-600" />,
      dhikr: <Moon className="w-5 h-5 text-purple-600" />,
      dua: <Moon className="w-5 h-5 text-blue-600" />,
      tasbih: <Moon className="w-5 h-5 text-indigo-600" />,
      charity: <Heart className="w-5 h-5 text-rose-600" />,
      family_time: <Users className="w-5 h-5 text-emerald-600" />
    };
    return icons[type] || <Sparkles className="w-5 h-5 text-amber-600" />;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Islamic Lifestyle Suggestions
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getIcon(suggestion.routine_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
                        <Badge variant={suggestion.category === 'Essential' ? 'default' : 'secondary'} className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{suggestion.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.target_time.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {suggestion.frequency.replace(/_/g, ' ')}
                        </Badge>
                        {suggestion.target_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {suggestion.target_count}x
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAcceptSuggestion(suggestion)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            onClick={generateSuggestions}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            disabled={loading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}