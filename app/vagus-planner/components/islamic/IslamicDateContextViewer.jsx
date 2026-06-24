import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BookOpen, Lightbulb, Heart } from 'lucide-react';
import { toast } from 'sonner';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

export default function IslamicDateContextViewer({ event, isOpen, onClose }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && event && !context) {
      loadContext();
    }
  }, [isOpen, event, context]);

  const loadContext = async () => {
    if (!event?.hijri_month || !event?.hijri_day) return;
    
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('aiIslamicEventSuggestions', {
        hijri_day: event.hijri_day,
        hijri_month: event.hijri_month,
        hijri_year: event.hijri_year || new Date().getFullYear()
      });
      setContext(data);
    } catch (error) {
      console.error('Error loading context:', error);
      toast.error('Failed to load context');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Header */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="pt-6">
              <p className="text-lg font-semibold text-slate-800">
                {event.hijri_day} {HIJRI_MONTHS[event.hijri_month - 1]} {event.hijri_year || 'AH'}
              </p>
              <p className="text-sm text-slate-600 mt-1">{event.description}</p>
            </CardContent>
          </Card>

          {/* AI Context */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : context ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Significance */}
              {context.date_significance && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Significance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 leading-relaxed">{context.date_significance}</p>
                  </CardContent>
                </Card>
              )}

              {/* Religious Context */}
              {context.religious_context && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      Religious Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 leading-relaxed">{context.religious_context}</p>
                  </CardContent>
                </Card>
              )}

              {/* Fasting & Special Nights */}
              <div className="grid grid-cols-2 gap-3">
                {context.fasting_status && (
                  <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">🌙 Fasting</p>
                      <p className="text-xs text-yellow-800">{context.fasting_status}</p>
                    </CardContent>
                  </Card>
                )}
                {context.special_night && (
                  <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">✨ Special Night</p>
                      <p className="text-xs text-indigo-800">{context.special_night}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recommendations */}
              {context.recommendations && context.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {context.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Duas */}
              {context.dua_suggestions && context.dua_suggestions.length > 0 && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">📿 Suggested Duas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {context.dua_suggestions.map((dua, idx) => (
                        <li key={idx} className="text-sm text-green-900 flex gap-2">
                          <span className="font-bold">•</span>
                          <span>{dua}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Activities */}
              {context.suggested_activities && context.suggested_activities.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎯 Suggested Activities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {context.suggested_activities.map((activity, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex gap-2">
                          <span className="text-teal-600 font-bold">→</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Historical Events */}
              {context.historical_events && (
                <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">📚 Historical Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 leading-relaxed">{context.historical_events}</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : null}

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}