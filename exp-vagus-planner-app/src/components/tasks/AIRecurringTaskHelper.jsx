import React, { useEffect, useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Lightbulb, Clock, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AIRecurringTaskHelper({ taskTitle, category, recurrenceType, onApplyDescription }) {
  const [aiContent, setAiContent] = useState(null);

  const generateMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('generateRecurringTaskDescription', {
      task_title: taskTitle,
      category: category,
      recurrence_type: recurrenceType
    }),
    onSuccess: (response) => {
      setAiContent(response.data);
      toast.success('AI generated task details!');
    },
    onError: () => {
      toast.error('Failed to generate description');
    }
  });

  // Auto-generate when task info changes
  useEffect(() => {
    if (taskTitle && taskTitle.length > 5 && recurrenceType) {
      const timer = setTimeout(() => {
        generateMutation.mutate();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [taskTitle, recurrenceType]);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Task Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!aiContent ? (
          <div className="flex items-center justify-center py-4">
            {generateMutation.isPending ? (
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-slate-600">Personalizing task details...</p>
              </div>
            ) : (
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!taskTitle || !recurrenceType}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Details
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* AI Generated Description */}
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-sm text-slate-700 leading-relaxed">{aiContent.description}</p>
            </div>

            {/* Estimated Time */}
            {aiContent.estimated_minutes && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-slate-700">
                  Estimated time: <Badge variant="outline" className="ml-1">{aiContent.estimated_minutes} min</Badge>
                </span>
              </div>
            )}

            {/* Suggested Subtasks */}
            {aiContent.subtasks?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  Suggested Subtasks
                </h4>
                <div className="space-y-1">
                  {aiContent.subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-white rounded border border-purple-100">
                      <CheckSquare className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-700">{subtask.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {aiContent.tips?.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  Tips
                </h4>
                {aiContent.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-amber-600 flex-shrink-0">💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => onApplyDescription && onApplyDescription(aiContent)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                size="sm"
              >
                Apply to Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
              >
                <Sparkles className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}