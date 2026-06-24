import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HajjFeedbackButton from './HajjFeedbackButton';

const QUICK_QUESTIONS = [
  "What should I do if I miss Arafat?",
  "Can I perform Umrah during menstruation?",
  "What are the duas for Tawaf?",
  "How do I perform Sa'i correctly?",
  "What to do if I violate Ihram rules?",
  "Best hotels near Haram?",
  "How to use Mecca Metro?",
  "What food is available near Haram?"
];

export default function HajjAIGuide() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);

  const askQuestion = async (customQuestion) => {
    const q = customQuestion || question;
    if (!q.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setConversation(prev => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);

    try {
      const { data } = await base44.functions.invoke('hajjUmrahAIAssistant', {
        action: 'answer_question',
        question: q
      });

      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer,
        sources: data.sources 
      }]);
    } catch (error) {
      toast.error('Failed to get answer');
      setConversation(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Hajj & Umrah AI Guide
          </CardTitle>
          <p className="text-sm text-slate-600">
            Ask anything about rituals, rulings, logistics, or travel tips
          </p>
        </CardHeader>
      </Card>

      {/* Quick Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => askQuestion(q)}
                disabled={loading}
                className="text-xs"
              >
                {q}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversation */}
      {conversation.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4 max-h-[500px] overflow-y-auto">
            {conversation.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-800'
                } rounded-lg`}>
                  <div className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && (
                      <div className="mt-2 pt-2 border-t border-slate-300">
                        <p className="text-xs opacity-75">Sources: {msg.sources}</p>
                      </div>
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="px-3 pb-3 pt-0">
                      <HajjFeedbackButton
                        feedbackType="ai_answer"
                        context={{ question: conversation[idx - 1]?.content, answer: msg.content }}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask your question about Hajj or Umrah..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              rows={2}
              className="flex-1"
            />
            <Button
              onClick={() => askQuestion()}
              disabled={loading || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}