import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AIStepGenerator({ stepType, workflowContext, triggerType, onApply }) {
  const [generatedConfig, setGeneratedConfig] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => SDK.functions.invoke('generateWorkflowStepConfig', {
      step_type: stepType,
      workflow_context: workflowContext,
      trigger_type: triggerType
    }),
    onSuccess: (response) => {
      setGeneratedConfig(response.data);
      toast.success('AI generated configuration!');
    },
    onError: () => {
      toast.error('Failed to generate config');
    }
  });

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        variant="outline"
        size="sm"
        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Generating with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-2" />
            Generate with AI
          </>
        )}
      </Button>

      {generatedConfig && (
        <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <Badge className="bg-purple-600">AI Generated</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onApply(generatedConfig.generated_config)}
            >
              Apply to Form
            </Button>
          </div>

          {/* Display config */}
          <div className="space-y-2 text-sm">
            {Object.entries(generatedConfig.generated_config || {}).map(([key, value]) => (
              <div key={key} className="bg-white rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">{key}:</span>
                  <button
                    onClick={() => handleCopy(String(value))}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="text-slate-600 text-xs">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {generatedConfig.suggestions?.length > 0 && (
            <div className="text-xs">
              <div className="font-medium text-slate-700 mb-1">💡 Alternative ideas:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                {generatedConfig.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Best practices */}
          {generatedConfig.best_practices && (
            <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
              <span className="font-medium text-amber-900">✨ Tip: </span>
              <span className="text-amber-800">{generatedConfig.best_practices}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}