import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  MessageSquare,
  Calendar,
  Sparkles,
  Clock,
  Target,
  Activity,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import AIContentAssistant from '@/components/assistant/AIContentAssistant';

const COLORS = ['#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const queryClient = useQueryClient();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getAnalytics', { timeRange });
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const { eventMetrics, chatMetrics, aiMetrics, dailyTrends } = analytics || {};

  const pieData = [
    { name: 'Events', value: eventMetrics?.total_events_created || 0 },
    { name: 'Messages', value: chatMetrics?.total_messages || 0 },
    { name: 'AI Interactions', value: (aiMetrics?.suggestions_accepted || 0) + (aiMetrics?.suggestions_rejected || 0) }
  ];

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              Analytics Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Insights into your productivity and app usage
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIAssistant(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Insights
            </Button>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-100 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Events Created</CardTitle>
                <Calendar className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {eventMetrics?.total_events_created || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {eventMetrics?.completion_rate || 0}% completion rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-cyan-100 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Messages</CardTitle>
                <MessageSquare className="w-5 h-5 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {chatMetrics?.total_messages || 0}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {chatMetrics?.messages_sent || 0} sent, {chatMetrics?.messages_received || 0} received
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-violet-100 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">AI Acceptance</CardTitle>
                <Sparkles className="w-5 h-5 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {aiMetrics?.acceptance_rate || 0}%
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {aiMetrics?.suggestions_accepted || 0} accepted suggestions
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-emerald-100 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">AI Success</CardTitle>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {aiMetrics?.success_rate || 0}%
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Avg {aiMetrics?.avg_response_time || 0}s response
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Trends */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-100 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Daily Activity Trends
                </CardTitle>
                <CardDescription>Your activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={2} name="Events" />
                    <Line type="monotone" dataKey="messages" stroke="#06b6d4" strokeWidth={2} name="Messages" />
                    <Line type="monotone" dataKey="ai_interactions" stroke="#14b8a6" strokeWidth={2} name="AI" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-100 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Activity Distribution
                </CardTitle>
                <CardDescription>Where you spend your time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Performance Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-purple-100 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Assistant Performance
              </CardTitle>
              <CardDescription>Detailed AI interaction metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Suggestions', Accepted: aiMetrics?.suggestions_accepted || 0, Rejected: aiMetrics?.suggestions_rejected || 0 },
                    { name: 'Scheduling', Success: aiMetrics?.schedule_success || 0, Failed: aiMetrics?.schedule_failed || 0 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="Accepted" fill="#14b8a6" />
                  <Bar dataKey="Rejected" fill="#ef4444" />
                  <Bar dataKey="Success" fill="#10b981" />
                  <Bar dataKey="Failed" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Content Assistant */}
        {showAIAssistant && (
          <AIContentAssistant
            open={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            contentType="analytics summary"
            context={`Analytics data: ${eventMetrics?.total_events_created || 0} events, ${chatMetrics?.total_messages || 0} messages, ${aiMetrics?.acceptance_rate || 0}% AI acceptance rate. Time range: ${timeRange}`}
            onApply={(content) => {
              console.log('Generated analytics insights:', content);
            }}
          />
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}