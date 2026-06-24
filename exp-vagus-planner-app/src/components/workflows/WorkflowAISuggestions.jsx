import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function WorkflowAISuggestions({ triggerType, existingSteps, onApplySuggestion }) {
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [suggestions, setSuggestions] = useState(null);

  const generateSuggestionsMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('suggestWorkflowSteps', {
      trigger_type: triggerType,
      desired_outcome: desiredOutcome,
      existing_steps: existingSteps
    }),
    onSuccess: (response) => {
      setSuggestions(response.data);
    }
  });

  const handleApplyStep = (step) => {
    onApplySuggestion({
      id: `step_${Date.now()}`,
      type: step.type,
      config: step.config,
      conditions: step.suggested_conditions || [],
      on_success: null,
      on_failure: null
    });
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-slate-800">AI Workflow Assistant</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm">What do you want this workflow to achieve?</Label>
          <Textarea
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="e.g., Send a reminder email 1 day before an event and create a follow-up task after it completes"
            rows={3}
            className="mt-1"
          />
        </div>

        <Button
          onClick={() => generateSuggestionsMutation.mutate()}
          disabled={!desiredOutcome || generateSuggestionsMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
          size="sm"
        >
          {generateSuggestionsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </>
          )}
        </Button>

        {suggestions && (
          <div className="mt-4 space-y-3">
            {/* Overall Explanation */}
            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">{suggestions.explanation}</p>
              </div>
            </div>

            {/* Suggested Steps */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">Suggested Steps:</p>
              {suggestions.suggestions?.map((step, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-purple-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {step.type}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyStep(step)}
                      className="text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{step.explanation}</p>
                  {step.config && Object.keys(step.config).length > 0 && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      Config: {JSON.stringify(step.config, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Best Practices */}
            {suggestions.best_practices && suggestions.best_practices.length > 0 && (
              <div className="bg-white p-3 rounded-lg border border-purple-100">
                <p className="text-xs font-medium text-slate-700 mb-2">Best Practices:</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  {suggestions.best_practices.map((practice, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {practice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}