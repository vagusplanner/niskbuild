import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function EnhancedDuaCard() {
  const [duaData, setDuaData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDuas = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('enhancedDuaSuggestion', {});
      setDuaData(data);
      toast.success('Duas tailored to your current state');
    } catch (error) {
      toast.error('Failed to fetch duas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuas();
  }, []);

  if (loading && !duaData) {
    return (
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Personalized Du'as
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!duaData || !duaData.duas || duaData.duas.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Personalized Du'as
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchDuas} className="w-full">
            Load Du'as
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 border-violet-200 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <Zap className="w-5 h-5 text-violet-600" />
                Duas for Your Current State
              </CardTitle>
              <p className="text-sm text-violet-700 mt-1">
                Spiritually aligned with your needs right now
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDuas}
              disabled={loading}
              className="text-violet-600 hover:text-violet-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Personalized Guidance */}
          {duaData.personalized_guidance && (
            <div className="bg-white/70 rounded-lg p-4 border border-violet-100">
              <p className="text-sm text-violet-900">
                {duaData.personalized_guidance}
              </p>
            </div>
          )}

          {/* Duas List */}
          <div className="space-y-3">
            {duaData.duas.map((dua, index) => (
              <motion.div
                key={dua.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${
                  dua.priority === 'primary'
                    ? 'bg-violet-100/50 border-l-violet-600'
                    : 'bg-purple-100/30 border-l-purple-500'
                }`}
              >
                {/* Priority Badge */}
                {dua.priority && (
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-violet-900">{dua.title}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        dua.priority === 'primary'
                          ? 'bg-violet-600 text-white'
                          : 'bg-purple-500 text-white'
                      }`}
                    >
                      {dua.priority === 'primary' ? 'Primary' : 'Suggested'}
                    </span>
                  </div>
                )}

                {/* Arabic Du'a */}
                {dua.arabic_text && (
                  <p className="text-right text-lg leading-relaxed font-arabic text-violet-900 mb-2 dir-rtl">
                    {dua.arabic_text}
                  </p>
                )}

                {/* Transliteration */}
                {dua.transliteration && (
                  <p className="text-sm text-violet-700 italic mb-2">
                    {dua.transliteration}
                  </p>
                )}

                {/* English Translation */}
                <p className="text-sm text-slate-700 mb-3">
                  {dua.english_translation}
                </p>

                {/* Why This Du'a */}
                {dua.recommendation_reason && (
                  <div className="bg-white/50 rounded p-2 mb-2 border-l-2 border-violet-500">
                    <p className="text-xs font-semibold text-violet-800">Why This Du'a:</p>
                    <p className="text-xs text-violet-700 mt-1">
                      {dua.recommendation_reason}
                    </p>
                  </div>
                )}

                {/* Spiritual Benefit */}
                {dua.spiritual_benefit && (
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold text-violet-900">Benefit: </span>
                      {dua.spiritual_benefit}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Emotional Resonance */}
          {duaData.emotional_resonance && (
            <div className="bg-gradient-to-r from-indigo-100/50 to-violet-100/50 rounded-lg p-4">
              <p className="text-sm font-semibold text-indigo-900 mb-1">
                How These Du'as Help You
              </p>
              <p className="text-sm text-indigo-800">
                {duaData.emotional_resonance}
              </p>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            onClick={fetchDuas}
            variant="outline"
            className="w-full border-violet-300 text-violet-700 hover:bg-violet-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Get New Suggestions
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}