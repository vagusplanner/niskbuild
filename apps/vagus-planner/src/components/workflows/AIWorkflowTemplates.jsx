import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AIWorkflowTemplates({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);

  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('suggestWorkflowTemplates'),
    onSuccess: (response) => {
      setTemplates(response.data.templates || []);
      toast.success('AI generated workflow suggestions!');
    },
    onError: () => {
      toast.error('Failed to generate templates');
    }
  });

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Workflow Suggestions
        </CardTitle>
        <p className="text-sm text-slate-600">
          Get personalized workflow templates based on your activity patterns
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing your patterns...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {templates.map((template, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 mb-1">
                            {template.name}
                          </h4>
                          <p className="text-sm text-slate-600 mb-2">
                            {template.description}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-purple-50">
                          {template.trigger_type?.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-slate-500">
                          {template.steps?.length || 0} steps
                        </span>
                      </div>

                      {template.use_case && (
                        <div className="mt-2 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 rounded p-2">
                          <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{template.use_case}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Generate More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}