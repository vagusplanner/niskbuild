import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, Eye, MousePointer, Send } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function CampaignPerformanceModal({ campaign, onClose }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(campaign.ai_insights || null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('analyzeCampaignPerformance', {
        campaign_id: campaign.id
      });

      setAnalysis(data.insights);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze campaign');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = campaign.performance_metrics || {};

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto safe-area-padding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Campaign Performance: {campaign.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Sent</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {metrics.sent_count || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Opens</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {metrics.opened_count || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metrics.open_rate?.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Clicks</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {metrics.clicked_count || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metrics.click_rate?.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Engagement</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {((metrics.open_rate || 0) * 0.6 + (metrics.click_rate || 0) * 0.4).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Details */}
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-4 space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Subject Line:</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{campaign.subject_line}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Target Audience:</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{campaign.target_audience}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tone:</p>
                <Badge variant="outline">{campaign.tone}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {!analysis && (
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Performance...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI-Powered Insights
                </>
              )}
            </Button>
          )}

          {analysis && (
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">AI Insights</h3>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
                <Button
                  onClick={handleAnalyze}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  disabled={loading}
                >
                  Regenerate Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4 border-t dark:border-slate-800">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}