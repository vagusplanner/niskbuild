import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, TrendingUp, Send, Eye, MousePointer, Sparkles, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import EmailCampaignForm from '@/components/email/EmailCampaignForm';
import CampaignPerformanceModal from '@/components/email/CampaignPerformanceModal';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function EmailCampaignsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['emailCampaigns'],
    queryFn: () => SDK.entities.EmailCampaign.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.EmailCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailCampaigns'] });
      toast.success('Campaign deleted');
    }
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['emailCampaigns'] });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      sent: 'bg-green-100 text-green-700',
      archived: 'bg-slate-100 text-slate-700'
    };
    return colors[status] || colors.draft;
  };

  const calculateOverallMetrics = () => {
    const sent = campaigns.filter(c => c.status === 'sent');
    const totalSent = sent.reduce((sum, c) => sum + (c.performance_metrics?.sent_count || 0), 0);
    const totalOpened = sent.reduce((sum, c) => sum + (c.performance_metrics?.opened_count || 0), 0);
    const totalClicked = sent.reduce((sum, c) => sum + (c.performance_metrics?.clicked_count || 0), 0);

    return {
      totalCampaigns: campaigns.length,
      sentCampaigns: sent.length,
      avgOpenRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
      avgClickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0
    };
  };

  const metrics = calculateOverallMetrics();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-slate-950 dark:via-purple-900/10 dark:to-pink-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <Mail className="w-8 h-8 text-purple-600" />
                  Email Campaigns
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  AI-powered email marketing campaigns
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingCampaign(null);
                  setShowForm(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            {/* Overall Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Campaigns</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalCampaigns}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sent</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.sentCampaigns}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg Open Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.avgOpenRate}%</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointer className="w-4 h-4 text-pink-600" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg Click Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.avgClickRate}%</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Campaigns List */}
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{campaign.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                          <Badge variant="outline" className="text-xs">{campaign.tone}</Badge>
                          {campaign.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          <strong>Subject:</strong> {campaign.subject_line}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          <strong>Audience:</strong> {campaign.target_audience}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'sent' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Analytics
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCampaign(campaign);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(campaign.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {campaign.performance_metrics && campaign.status === 'sent' && (
                    <CardContent className="border-t dark:border-slate-800 pt-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Opens</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {campaign.performance_metrics.open_rate?.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Clicks</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {campaign.performance_metrics.click_rate?.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sent</p>
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {campaign.performance_metrics.sent_count || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}

            {campaigns.length === 0 && !isLoading && (
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur p-12 text-center">
                <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  No campaigns yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Create your first AI-powered email campaign
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Card>
            )}
          </div>

          {/* Campaign Form Modal */}
          {showForm && (
            <EmailCampaignForm
              campaign={editingCampaign}
              onClose={() => {
                setShowForm(false);
                setEditingCampaign(null);
              }}
              onSave={() => {
                setShowForm(false);
                setEditingCampaign(null);
                queryClient.invalidateQueries({ queryKey: ['emailCampaigns'] });
              }}
            />
          )}

          {/* Performance Modal */}
          {selectedCampaign && (
            <CampaignPerformanceModal
              campaign={selectedCampaign}
              onClose={() => setSelectedCampaign(null)}
            />
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}