import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sparkles, Loader2, FileText, Download, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function CharityFinancialReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [timePeriod, setTimePeriod] = useState('year');

  const { data: charities = [] } = useQuery({
    queryKey: ['charities'],
    queryFn: () => base44.entities.CharitableGiving.list('-date', 100)
  });

  const { data: zakatCalcs = [] } = useQuery({
    queryKey: ['zakatCalcs'],
    queryFn: () => base44.entities.ZakatCalculation.list('-year')
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateCharityReport', {
        charitable_giving: charities,
        zakat_calculations: zakatCalcs,
        time_period: timePeriod
      });
      setReport(data.report);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const content = JSON.stringify(report, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `charity-report-${timePeriod}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Report downloaded!');
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (!report) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            Charity Financial Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Report Period
              </label>
              <div className="flex gap-2">
                {['month', 'quarter', 'year'].map(period => (
                  <Button
                    key={period}
                    variant={timePeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimePeriod(period)}
                    className="capitalize"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateReport}
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-800"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, breakdown, insights, trends, recommendations, Islamic_reflection, certificate_eligible } = report;

  // Prepare data for charts
  const typeData = Object.entries(breakdown.by_type).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  }));

  const categoryData = Object.entries(breakdown.by_category).map(([key, value]) => ({
    name: key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1),
    ...value
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Charity Financial Report
        </CardTitle>
        <Button
          onClick={downloadReport}
          size="sm"
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200"
          >
            <p className="text-xs text-slate-600 font-semibold">Total Given</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              ${summary.total_given.toLocaleString()}
            </p>
            <Badge className="bg-green-100 text-green-700 text-xs mt-2">
              {summary.num_donations} donations
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200"
          >
            <p className="text-xs text-slate-600 font-semibold">Zakat</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              ${summary.total_zakat.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200"
          >
            <p className="text-xs text-slate-600 font-semibold">Sadaqah</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ${summary.total_sadaqah.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200"
          >
            <p className="text-xs text-slate-600 font-semibold">Period</p>
            <p className="text-lg font-bold text-amber-700 mt-1 capitalize">
              {summary.period}
            </p>
          </motion.div>
        </div>

        {/* Charts */}
        {typeData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4">Giving by Type</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4">Top Categories</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Key Insights
          </h4>
          {insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200"
            >
              <p className="font-semibold text-slate-800">{insight.title}</p>
              <p className="text-sm text-slate-700 mt-1">{insight.finding}</p>
              <p className="text-xs text-slate-600 mt-2 italic">✨ {insight.significance}</p>
            </motion.div>
          ))}
        </div>

        {/* Trends & Recommendations */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-slate-800 mb-3">Trends</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Consistency:</span> {trends.consistency}</p>
              <p><span className="font-semibold">Growth:</span> {trends.growth}</p>
              <p><span className="font-semibold">Impact:</span> {trends.impact}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
            <h4 className="font-semibold text-slate-800 mb-3">Recommendations</h4>
            <div className="space-y-2 text-sm">
              {recommendations.slice(0, 2).map((rec, idx) => (
                <p key={idx}>
                  <span className="font-semibold">{rec.area}:</span> {rec.suggestion}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Islamic Reflection */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-4 border-2 border-amber-300">
          <p className="font-semibold text-amber-900 mb-2">📖 Islamic Reflection</p>
          <p className="text-sm text-amber-900 italic">{Islamic_reflection}</p>
        </div>

        {/* Certificate Badge */}
        {certificate_eligible && (
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-400">
            <p className="text-sm font-semibold text-green-800">
              ✨ Eligible for Charity Certificate
            </p>
            <p className="text-xs text-green-700 mt-1">
              Your giving demonstrates consistent charitable commitment. You may request a certificate of charitable contributions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}