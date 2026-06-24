import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const priorityConfig = {
  low: { color: 'text-slate-600 bg-slate-100', icon: '○' },
  medium: { color: 'text-blue-600 bg-blue-100', icon: '◐' },
  high: { color: 'text-orange-600 bg-orange-100', icon: '◕' },
  urgent: { color: 'text-red-600 bg-red-100', icon: '●' }
};

export default function AIPrioritySuggester({ 
  title, 
  description, 
  due_date, 
  due_time,
  category,
  currentPriority,
  onApplySuggestion 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    // Auto-analyze when task details change
    if (title && title.length > 3) {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [title, description, due_date, category]);

  const handleAnalyze = async () => {
    if (!title || title.length < 3) return;

    setIsAnalyzing(true);
    try {
      const { data } = await SDK.functions.invoke('suggestTaskPriority', {
        title,
        description,
        due_date,
        due_time,
        category
      });

      if (data.success) {
        setSuggestion(data);
      } else if (data.limit_exceeded) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Priority analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center gap-2 text-sm text-purple-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          AI analyzing priority...
        </div>
      </Card>
    );
  }

  if (!suggestion) return null;

  const isDifferent = suggestion.suggested_priority !== currentPriority;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        <Card className={cn(
          "p-4 border-2",
          isDifferent 
            ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300" 
            : "bg-green-50 border-green-300"
        )}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <Sparkles className={cn(
                  "w-5 h-5 mt-0.5",
                  isDifferent ? "text-purple-600" : "text-green-600"
                )} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {isDifferent ? 'AI Priority Suggestion' : 'Priority Confirmed'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.confidence} confidence
                    </Badge>
                  </div>
                  
                  {isDifferent ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className={cn("capitalize", priorityConfig[currentPriority]?.color)}>
                        {priorityConfig[currentPriority]?.icon} Current: {currentPriority}
                      </Badge>
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      <Badge className={cn("capitalize", priorityConfig[suggestion.suggested_priority]?.color)}>
                        {priorityConfig[suggestion.suggested_priority]?.icon} Suggested: {suggestion.suggested_priority}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Current priority looks optimal
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-700 bg-white/60 rounded-lg p-3">
              <p className="font-medium mb-1">Reasoning:</p>
              <p className="text-slate-600">{suggestion.reasoning}</p>
            </div>

            {suggestion.urgency_factors?.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-medium text-slate-700">Key factors:</p>
                <ul className="space-y-0.5 text-slate-600">
                  {suggestion.urgency_factors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isDifferent && (
              <Button
                onClick={() => onApplySuggestion(suggestion.suggested_priority)}
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Suggested Priority
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}