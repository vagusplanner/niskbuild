import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, Lightbulb, Loader2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function BudgetInsights({ holiday }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: allHolidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-start_date')
  });

  const { data: currentExpenses = [] } = useQuery({
    queryKey: ['holiday-expenses', holiday?.id],
    queryFn: () => base44.entities.HolidayExpense.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['all-expenses'],
    queryFn: async () => {
      const expenses = [];
      for (const h of allHolidays) {
        const holidayExpenses = await base44.entities.HolidayExpense.filter({ holiday_id: h.id });
        expenses.push(...holidayExpenses.map(exp => ({ ...exp, holiday_title: h.title })));
      }
      return expenses;
    },
    enabled: allHolidays.length > 0
  });

  const generateInsights = async () => {
    setLoading(true);
    try {
      const pastHolidays = allHolidays
        .filter(h => h.status === 'completed' && h.id !== holiday.id)
        .slice(0, 5);

      const pastExpenseData = await Promise.all(
        pastHolidays.map(async (h) => {
          const expenses = await base44.entities.HolidayExpense.filter({ holiday_id: h.id });
          return {
            destination: h.destination,
            total_budget: h.budget,
            total_spent: expenses.reduce((sum, e) => sum + e.amount, 0),
            by_category: expenses.reduce((acc, e) => {
              acc[e.category] = (acc[e.category] || 0) + e.amount;
              return acc;
            }, {})
          };
        })
      );

      const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
      const currentByCategory = currentExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});

      const { data } = await base44.functions.invoke('generateBudgetInsights', {
        current_holiday: {
          destination: holiday.destination,
          budget: holiday.budget,
          spent: currentTotal,
          by_category: currentByCategory,
          days_remaining: Math.max(0, Math.ceil((new Date(holiday.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        },
        past_holidays: pastExpenseData,
        similar_destinations: allHolidays
          .filter(h => h.destination?.toLowerCase().includes(holiday.destination?.toLowerCase().split(',')[0] || ''))
          .slice(0, 3)
          .map(h => ({ destination: h.destination, budget: h.budget }))
      });

      setInsights(data);
    } catch (error) {
      toast.error('Failed to generate insights');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const hasExpenses = currentExpenses.length > 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-800">AI Budget Insights</h3>
        </div>
        <Button
          size="sm"
          onClick={generateInsights}
          disabled={loading || !hasExpenses}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
        </Button>
      </div>

      {!hasExpenses && !insights && (
        <p className="text-sm text-slate-600">
          Add some expenses to get AI-powered budget insights and cost-saving recommendations.
        </p>
      )}

      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Spending Trends */}
          {insights.spending_trends && (
            <div className="p-3 bg-white rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-medium text-slate-800">Spending Trends</h4>
              </div>
              <p className="text-sm text-slate-600">{insights.spending_trends}</p>
            </div>
          )}

          {/* Cost Savings */}
          {insights.cost_savings?.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-medium text-slate-800">Potential Savings</h4>
              </div>
              <div className="space-y-2">
                {insights.cost_savings.map((saving, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      Save ${saving.amount}
                    </Badge>
                    <p className="text-sm text-slate-600 flex-1">{saving.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-medium text-slate-800">Smart Recommendations</h4>
              </div>
              <ul className="space-y-1.5">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-indigo-600 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price Comparison */}
          {insights.price_comparison && (
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h4 className="text-sm font-medium text-slate-800 mb-1">Price Comparison</h4>
              <p className="text-sm text-slate-600">{insights.price_comparison}</p>
            </div>
          )}
        </motion.div>
      )}
    </Card>
  );
}