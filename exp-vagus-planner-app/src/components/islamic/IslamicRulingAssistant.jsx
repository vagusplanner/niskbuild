import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, HelpCircle, BookOpen, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function IslamicRulingAssistant() {
  const [question, setQuestion] = useState('');
  const [ruling, setRuling] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const submitQuestion = async () => {
    if (!question.trim()) {
      toast.error('Please ask a question');
      return;
    }

    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('getIslamicRulingOnPilgrimage', {
        question: question,
        pilgrimage_type: 'hajj',
        user_language: 'en'
      });
      setRuling(data);
      setHistory(prev => [{ q: question, a: data }, ...prev].slice(0, 5));
      setQuestion('');
      toast.success('Ruling retrieved!');
    } catch (error) {
      toast.error('Failed to get ruling');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            Ask an Islamic Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about Islamic rulings related to Hajj/Umrah..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && submitQuestion()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={submitQuestion} disabled={loading || !question.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Ask'
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Ask about Islamic rulings, etiquette, health matters, and preparation for pilgrimage
          </p>
        </CardContent>
      </Card>

      {/* Current Ruling */}
      {ruling && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Answer */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-800 leading-relaxed">{ruling.answer}</p>
            </CardContent>
          </Card>

          {/* Evidence */}
          {ruling.evidence?.length > 0 && (
            <Card className="border-emerald-200">
              <CardHeader>
                <CardTitle className="text-sm">Quranic & Hadith Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ruling.evidence.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-900">{ev.source}</p>
                    <p className="text-xs italic text-emerald-800 mt-1">{ev.text}</p>
                    <p className="text-xs text-slate-700 mt-2">{ev.interpretation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Different Schools */}
          {ruling.different_schools?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Different Schools of Thought</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ruling.different_schools.map((school, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded">
                    <p className="text-sm font-semibold text-slate-900">{school.school}</p>
                    <p className="text-xs text-slate-700 mt-1">{school.opinion}</p>
                    <p className="text-xs text-slate-600 italic mt-1">Why: {school.reasoning}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Practical Application */}
          {ruling.practical_application && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm">How to Apply This</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-900">{ruling.practical_application}</p>
              </CardContent>
            </Card>
          )}

          {/* Confidence Level */}
          {ruling.confidence_level && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Scholar Confidence:</span>
              <Badge className={
                ruling.confidence_level === 'very_confident' ? 'bg-green-600' :
                ruling.confidence_level === 'confident' ? 'bg-emerald-600' :
                ruling.confidence_level === 'moderate' ? 'bg-yellow-600' :
                'bg-red-600'
              }>
                {ruling.confidence_level?.replace('_', ' ')}
              </Badge>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              For complex matters, consult with a qualified Islamic scholar. This is AI-assisted guidance based on Islamic jurisprudence.
            </p>
          </div>
        </motion.div>
      )}

      {/* Quick Access History */}
      {history.length > 0 && !ruling && (
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Recent Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(item.q);
                  setRuling(item.a);
                }}
                className="w-full text-left p-2 bg-white hover:bg-slate-100 rounded text-xs text-slate-700 transition-colors"
              >
                {item.q}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}