import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Loader2, Wand2, Copy, Check, 
  RefreshCw, Lightbulb, FileText, Scissors, Maximize2
} from 'lucide-react';
import { toast } from 'sonner';

const CONTENT_MODES = {
  brainstorm: {
    icon: Lightbulb,
    label: 'Brainstorm Ideas',
    prompt: (type, context) => `Generate creative ideas and suggestions for ${type}. Context: ${context}. Provide 5-7 diverse ideas in bullet points.`
  },
  draft: {
    icon: FileText,
    label: 'Generate Draft',
    prompt: (type, context) => `Write a comprehensive draft for ${type}. Context: ${context}. Make it detailed and professional.`
  },
  refine: {
    icon: Wand2,
    label: 'Refine & Improve',
    prompt: (type, context, current) => `Improve this ${type}: "${current}". Context: ${context}. Make it clearer, more engaging, and professional.`
  },
  expand: {
    icon: Maximize2,
    label: 'Expand Content',
    prompt: (type, context, current) => `Expand this ${type} with more details: "${current}". Context: ${context}. Add depth and examples.`
  },
  shorten: {
    icon: Scissors,
    label: 'Make Concise',
    prompt: (type, context, current) => `Make this ${type} more concise: "${current}". Keep key points but be brief and impactful.`
  }
};

export default function AIContentAssistant({ 
  open, 
  onClose, 
  contentType = 'content',
  currentContent = '',
  context = '',
  onApply
}) {
  const [mode, setMode] = useState('draft');
  const [additionalInput, setAdditionalInput] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedContent('');

    try {
      const modeConfig = CONTENT_MODES[mode];
      const fullContext = `${context}${additionalInput ? ` Additional details: ${additionalInput}` : ''}`;
      const prompt = modeConfig.prompt(contentType, fullContext, currentContent);

      const { data } = await base44.functions.invoke('aiContentGenerator', {
        prompt,
        mode,
        content_type: contentType
      });

      setGeneratedContent(data.content);
      toast.success('Content generated!');
    } catch (error) {
      toast.error('Failed to generate content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(generatedContent);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto safe-area-padding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Content Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              What would you like to do?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(CONTENT_MODES).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${
                      isSelected ? 'text-purple-600' : 'text-slate-400'
                    }`} />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {config.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Content (for refine/expand/shorten modes) */}
          {['refine', 'expand', 'shorten'].includes(mode) && currentContent && (
            <Card className="p-3 bg-slate-50 dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Current Content:</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{currentContent}</p>
            </Card>
          )}

          {/* Additional Input */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Additional Details (Optional)
            </label>
            <Textarea
              placeholder="Add any specific requirements, tone preferences, or key points to include..."
              value={additionalInput}
              onChange={(e) => setAdditionalInput(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-purple-600">Generated Content</Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerate}
                    className="h-8"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg">
                  {generatedContent}
                </pre>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          {generatedContent && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700">
                Apply Content
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}