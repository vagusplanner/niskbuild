import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion } from 'framer-motion';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, 
  Sparkles, DollarSign, Target, Heart, Plane,
  ShoppingBag, Loader2, CheckCircle, XCircle,
  ArrowUpRight, ArrowDownRight, Calendar, PiggyBank, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AIFinanceAdvisor() {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  // Fetch last 3 months of expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => SDK.entities.Expense.list('-date', 200)
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const islamicMode = settingsList[0]?.islamic_mode ?? false;

  // Calculate current month stats
  const thisMonth = React.useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    
    const income = monthExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const spending = monthExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const savings = monthExpenses.filter(e => e.type === 'saving').reduce((sum, e) => sum + e.amount, 0);
    const charity = monthExpenses.filter(e => e.type === 'zakat' || e.type === 'sadaqa').reduce((sum, e) => sum + e.amount, 0);
    
    return { income, spending, savings, charity, count: monthExpenses.length };
  }, [expenses]);

  // Last month comparison
  const lastMonth = React.useMemo(() => {
    const start = startOfMonth(subMonths(new Date(), 1));
    const end = endOfMonth(subMonths(new Date(), 1));
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
    return monthExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const spendingTrend = thisMonth.spending > lastMonth ? 'up' : 'down';
  const spendingChange = lastMonth > 0 ? Math.abs(((thisMonth.spending - lastMonth) / lastMonth) * 100).toFixed(0) : 0;

  // Category breakdown
  const categoryBreakdown = React.useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end && e.type === 'expense';
    });
    
    const breakdown = {};
    monthExpenses.forEach(e => {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    });
    
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenses]);

  const analyzeFinances = async () => {
    setAnalyzing(true);
    try {
      const prompt = `You are an AI financial advisor with expertise in Islamic finance principles.

Analyze this financial data:
- Current month income: $${thisMonth.income}
- Current month spending: $${thisMonth.spending}
- Current month savings: $${thisMonth.savings}
- Charity given (Zakat/Sadaqa): $${thisMonth.charity}
- Last month spending: $${lastMonth}
- Spending trend: ${spendingTrend} ${spendingChange}%

Top spending categories:
${categoryBreakdown.map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`).join('\n')}

${islamicMode ? 'IMPORTANT: Provide advice aligned with Islamic finance principles (halal earnings, avoid interest, encourage Sadaqa, proper Zakat calculation).' : ''}

Provide:
1. Overall financial health score (0-100)
2. ${islamicMode ? '3 personalized tips based on Islamic finance values' : '3 actionable savings tips'}
3. Budget forecast for next month
4. ${islamicMode ? 'Sadaqa/Zakat recommendations' : 'Emergency fund assessment'}
5. Spending alerts or warnings

Format as JSON with structure: {health_score, tips: [{title, message, priority}], forecast, charity_guidance, alerts: [{severity, message}]}`;

      const { data } = await SDK.functions.invoke('aiContentGenerator', { 
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            health_score: { type: 'number' },
            tips: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  message: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            },
            forecast: { type: 'string' },
            charity_guidance: { type: 'string' },
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      });
      
      setInsights(data);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none text-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <h2 className="font-bold text-lg">AI Finance Advisor</h2>
            </div>
            {islamicMode && <Badge className="bg-amber-500 text-white border-none">Islamic Finance</Badge>}
          </div>
          <p className="text-sm text-emerald-50">
            {islamicMode 
              ? 'Halal-compliant financial insights & spending guidance'
              : 'Smart spending analysis & budget forecasting'}
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Income</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">${thisMonth.income.toFixed(0)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-red-600" />
              <span className="text-xs text-slate-500">Spending</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">${thisMonth.spending.toFixed(0)}</p>
            {spendingTrend === 'up' && (
              <p className="text-xs text-red-600 mt-1">↑ {spendingChange}% vs last month</p>
            )}
            {spendingTrend === 'down' && (
              <p className="text-xs text-emerald-600 mt-1">↓ {spendingChange}% vs last month</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-500">Savings</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">${thisMonth.savings.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-500">{islamicMode ? 'Charity' : 'Giving'}</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">${thisMonth.charity.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      {!insights && (
        <Button 
          onClick={analyzeFinances}
          disabled={analyzing || expenses.length === 0}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing your finances...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Financial Insights
            </>
          )}
        </Button>
      )}

      {/* AI Insights */}
      {insights && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Health Score */}
          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Financial Health Score</span>
                <Badge className={insights.health_score >= 70 ? 'bg-emerald-500' : insights.health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}>
                  {insights.health_score}/100
                </Badge>
              </div>
              <Progress value={insights.health_score} className="h-2" indicatorClassName={insights.health_score >= 70 ? 'bg-emerald-500' : insights.health_score >= 40 ? 'bg-amber-500' : 'bg-red-500'} />
              <p className="text-xs text-slate-500 mt-2">
                {insights.health_score >= 70 && '💚 Excellent financial habits!'}
                {insights.health_score >= 40 && insights.health_score < 70 && '⚠️ Room for improvement'}
                {insights.health_score < 40 && '🚨 Consider reviewing your budget'}
              </p>
            </CardContent>
          </Card>

          {/* Alerts */}
          {insights.alerts?.length > 0 && (
            <div className="space-y-2">
              {insights.alerts.map((alert, i) => (
                <Card key={i} className={`border-l-4 ${
                  alert.severity === 'high' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                  alert.severity === 'medium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                }`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      alert.severity === 'high' ? 'text-red-600' :
                      alert.severity === 'medium' ? 'text-amber-600' :
                      'text-blue-600'
                    }`} />
                    <p className="text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Personalized Tips */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              {islamicMode ? 'Islamic Finance Guidance' : 'Personalized Tips'}
            </h3>
            <div className="space-y-2">
              {insights.tips?.map((tip, i) => (
                <Card key={i} className="border-teal-200 dark:border-teal-900 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        tip.priority === 'high' ? 'bg-red-100 dark:bg-red-950' :
                        tip.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-950' :
                        'bg-emerald-100 dark:bg-emerald-950'
                      }`}>
                        {tip.priority === 'high' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                        {tip.priority === 'medium' && <Target className="w-4 h-4 text-amber-600" />}
                        {tip.priority === 'low' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-1">{tip.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{tip.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Forecast */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200">Next Month Forecast</h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{insights.forecast}</p>
            </CardContent>
          </Card>

          {/* Charity Guidance (Islamic Mode) */}
          {islamicMode && insights.charity_guidance && (
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-900">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">Zakat & Sadaqa</h3>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{insights.charity_guidance}</p>
                <Link to={createPageUrl('ZakatCalculator')}>
                  <Button variant="outline" size="sm" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100">
                    <Star className="w-3.5 h-3.5 mr-1" />
                    Calculate Zakat Obligation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Top Categories */}
          {categoryBreakdown.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Top Spending Categories</h3>
                <div className="space-y-3">
                  {categoryBreakdown.map(([cat, amt]) => {
                    const pct = thisMonth.spending > 0 ? (amt / thisMonth.spending * 100).toFixed(0) : 0;
                    const icon = {
                      food: '🍔', transport: '🚗', shopping: '🛍️',
                      bills: '💡', health: '❤️', education: '📚',
                      entertainment: '🎬', fitness: '🏋️', charity: '🤲',
                      other: '📦'
                    }[cat] || '📦';
                    
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">${amt.toFixed(0)} ({pct}%)</span>
                        </div>
                        <Progress value={parseFloat(pct)} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refresh Analysis */}
          <Button 
            onClick={analyzeFinances}
            variant="outline"
            disabled={analyzing}
            className="w-full"
          >
            {analyzing ? 'Re-analyzing...' : 'Refresh Analysis'}
          </Button>
        </motion.div>
      )}

      {/* Empty state */}
      {expenses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No financial data yet</p>
            <p className="text-xs text-slate-400 mt-1">Start logging expenses to get AI insights</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}