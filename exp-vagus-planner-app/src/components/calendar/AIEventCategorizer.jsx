import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { Sparkles, Loader2, Tag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIEventCategorizer({ event, onCategorize }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const categorizeEvent = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('aiCategorizeEvent', {
        event: {
          title: event.title,
          description: event.description,
          location: event.location,
          start_date: event.start_date,
          end_date: event.end_date
        }
      });

      if (data.success) {
        setResult(data);
        toast.success('Event categorized by AI!');
        if (onCategorize) {
          onCategorize({
            category: data.category,
            tags: data.tags,
            priority: data.priority
          });
        }
      }
    } catch (error) {
      toast.error('Failed to categorize event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Event Categorization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={categorizeEvent}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Categorize with AI
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Categorized!</span>
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Category</p>
                <Badge className="capitalize">{result.category}</Badge>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-500 mb-1">Priority</p>
                <Badge variant={result.priority === 'high' ? 'destructive' : 'default'}>
                  {result.priority}
                </Badge>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 mb-1">AI Reasoning</p>
                <p className="text-sm text-slate-600">{result.reasoning}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
              className="w-full"
            >
              Re-categorize
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}