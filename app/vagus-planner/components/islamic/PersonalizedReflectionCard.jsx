import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, RefreshCw, Lightbulb, MessageCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PersonalizedReflectionCard() {
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(false);

  const fetchReflection = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generatePersonalizedIslamicContent', {
        content_type: 'daily_reflection',
        context: {}
      });
      setReflection(data.content);
      toast.success('Personal reflection generated based on your activities!');
    } catch (error) {
      toast.error('Failed to generate reflection');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReflection();
  }, []);

  if (loading && !reflection) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Today's Reflection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reflection) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Today's Reflection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchReflection} className="w-full">
            Generate Reflection
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
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Lightbulb className="w-5 h-5 text-emerald-600" />
                Today's Quranic Reflection
              </CardTitle>
              <p className="text-sm text-emerald-700 mt-1 font-medium">
                {reflection.verse_reference}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchReflection}
              disabled={loading}
              className="text-emerald-600 hover:text-emerald-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Verse Display */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-100">
            <p className="text-center text-lg leading-relaxed font-arabic text-emerald-900 dir-rtl mb-2">
              {reflection.verse_text}
            </p>
            <p className="text-sm text-center text-emerald-700 italic">
              {reflection.verse_reference}
            </p>
          </div>

          {/* Reflection Title */}
          <div>
            <h3 className="text-lg font-bold text-emerald-900 mb-2">
              {reflection.reflection_title}
            </h3>
            <p className="text-slate-700 leading-relaxed">
              {reflection.main_reflection}
            </p>
          </div>

          {/* Spiritual Insight */}
          <div className="bg-emerald-100/50 rounded-lg p-4 border-l-4 border-emerald-600">
            <p className="text-sm font-semibold text-emerald-900 mb-1">Spiritual Insight</p>
            <p className="text-sm text-emerald-800">
              {reflection.spiritual_insight}
            </p>
          </div>

          {/* Relevance */}
          <div className="bg-teal-100/50 rounded-lg p-4">
            <p className="text-sm font-semibold text-teal-900 mb-1">Why This Reflection</p>
            <p className="text-sm text-teal-800">
              {reflection.relevance}
            </p>
          </div>

          {/* Reflection Question */}
          <motion.div
            className="bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-lg p-4 cursor-pointer"
            onClick={() => setExpandedQuestion(!expandedQuestion)}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 mb-1">
                  Reflection Question
                </p>
                <motion.p
                  className="text-sm text-indigo-800"
                  animate={{ maxHeight: expandedQuestion ? 200 : 60 }}
                  transition={{ duration: 0.3 }}
                >
                  {reflection.reflection_question}
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <Button
            onClick={fetchReflection}
            variant="outline"
            className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Get Another Reflection
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}