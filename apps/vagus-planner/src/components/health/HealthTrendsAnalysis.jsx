import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Download, Loader2, Calendar, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HealthTrendsAnalysis() {
  const [period, setPeriod] = useState('weekly');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['healthTrends', period],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeHealthTrends', { period });
      return response.data.stats;
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateHealthReport', { period });
      return response.data.report;
    },
    onSuccess: (data) => {
      setReport(data);
      setShowReport(true);
    }
  });

  if (!trends) return null;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        <Button
          onClick={() => setPeriod('weekly')}
          variant={period === 'weekly' ? 'default' : 'outline'}
          className={period === 'weekly' ? 'bg-blue-600' : ''}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Weekly
        </Button>
        <Button
          onClick={() => setPeriod('monthly')}
          variant={period === 'monthly' ? 'default' : 'outline'}
          className={period === 'monthly' ? 'bg-blue-600' : ''}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Monthly
        </Button>
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sleep */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {trends.sleep.hours.avg.toFixed(1)}h
                </div>
                <div className="text-xs text-slate-600">Avg Sleep</div>
                <div className="text-xs text-slate-500 mt-2">Quality: {trends.sleep.quality.avg.toFixed(1)}/10</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Nutrition */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {trends.nutrition.calories.avg.toFixed(0)}
                </div>
                <div className="text-xs text-slate-600">Avg Calories</div>
                <div className="text-xs text-slate-500 mt-2">Protein: {trends.nutrition.protein.avg.toFixed(0)}g</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Exercise */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {trends.exercise.totalMinutes}
                </div>
                <div className="text-xs text-slate-600">Total Minutes</div>
                <div className="text-xs text-slate-500 mt-2">Sessions: {trends.exercise.sessions}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600 mb-1">
                  {trends.mood.rating.avg.toFixed(1)}/10
                </div>
                <div className="text-xs text-slate-600">Avg Mood</div>
                <div className="text-xs text-slate-500 mt-2">Stress: {trends.mood.stress.avg.toFixed(1)}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Health Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showReport ? (
            <Button
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate {period === 'weekly' ? 'Weekly' : 'Monthly'} Report
                </>
              )}
            </Button>
          ) : report ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Executive Summary</h4>
                <p className="text-sm text-slate-700">{report.executive_summary}</p>
              </div>

              <Tabs defaultValue="sleep" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="sleep">Sleep</TabsTrigger>
                  <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                  <TabsTrigger value="exercise">Exercise</TabsTrigger>
                  <TabsTrigger value="mood">Mood</TabsTrigger>
                </TabsList>

                <TabsContent value="sleep" className="space-y-2">
                  <p className="text-sm text-slate-700">{report.sleep_analysis}</p>
                </TabsContent>
                <TabsContent value="nutrition" className="space-y-2">
                  <p className="text-sm text-slate-700">{report.nutrition_analysis}</p>
                </TabsContent>
                <TabsContent value="exercise" className="space-y-2">
                  <p className="text-sm text-slate-700">{report.exercise_analysis}</p>
                </TabsContent>
                <TabsContent value="mood" className="space-y-2">
                  <p className="text-sm text-slate-700">{report.mood_analysis}</p>
                </TabsContent>
              </Tabs>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Patterns & Correlations</h4>
                <div className="space-y-2">
                  {report.correlations?.map((corr, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{corr}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Recommendations</h4>
                <div className="space-y-2">
                  {report.recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-slate-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
                <p className="text-sm text-slate-700 italic">{report.motivation}</p>
              </div>

              <Button
                onClick={() => generateReportMutation.mutate()}
                variant="outline"
                className="w-full"
              >
                Regenerate Report
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}