import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, Users, Droplet, BookOpen, Award, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORY_COLORS = {
  mosque: '#14B8A6',
  orphans: '#F59E0B',
  poor: '#10B981',
  education: '#3B82F6',
  healthcare: '#EF4444',
  disaster_relief: '#8B5CF6',
  general: '#6B7280'
};

const IMPACT_METRICS = {
  education: { icon: BookOpen, unit: 'students', multiplier: 0.5 },
  healthcare: { icon: Heart, unit: 'treatments', multiplier: 2 },
  orphans: { icon: Users, unit: 'children', multiplier: 0.25 },
  disaster_relief: { icon: Heart, unit: 'families', multiplier: 0.1 },
  mosque: { icon: BookOpen, unit: 'attendees', multiplier: 10 },
  poor: { icon: Users, unit: 'people', multiplier: 5 },
  general: { icon: Heart, unit: 'beneficiaries', multiplier: 1 }
};

export default function DonationImpactTracker() {
  const { data: donations = [] } = useQuery({
    queryKey: ['charitableGiving'],
    queryFn: () => base44.entities.CharitableGiving.filter({})
  });

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const zakatTotal = donations.filter(d => d.type === 'zakat').reduce((sum, d) => sum + d.amount, 0);
  const sadaqahTotal = donations.filter(d => d.type === 'sadaqah').reduce((sum, d) => sum + d.amount, 0);

  const byCategory = donations.reduce((acc, d) => {
    const cat = d.category || 'general';
    acc[cat] = (acc[cat] || 0) + d.amount;
    return acc;
  }, {});

  const categoryData = Object.entries(byCategory).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
    color: CATEGORY_COLORS[name] || CATEGORY_COLORS.general
  }));

  const calculateImpact = (category, amount) => {
    const metric = IMPACT_METRICS[category] || IMPACT_METRICS.general;
    const estimated = Math.round(amount * metric.multiplier);
    return { estimated, unit: metric.unit, Icon: metric.icon };
  };

  const totalImpact = Object.entries(byCategory).map(([cat, amount]) => {
    const impact = calculateImpact(cat, amount);
    return {
      category: cat.replace('_', ' '),
      ...impact,
      amount
    };
  });

  return (
    <div className="space-y-6">
      {/* Overall Impact */}
      <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-600" />
            Your Charitable Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                <span className="text-sm text-slate-600 font-medium">Total Donated</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                ${totalDonated.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-teal-200">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-teal-600" />
                <span className="text-sm text-slate-600 font-medium">Zakat Given</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                ${zakatTotal.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-600 font-medium">Sadaqah Given</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                ${sadaqahTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg text-white">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6" />
              <span className="font-semibold text-lg">Estimated People Helped</span>
            </div>
            <p className="text-4xl font-bold">
              {totalImpact.reduce((sum, item) => sum + item.estimated, 0).toLocaleString()}+
            </p>
            <p className="text-rose-100 text-sm mt-1">Based on average charity effectiveness</p>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <p>No donations yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impact by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {totalImpact.slice(0, 6).map((item, index) => {
                const Icon = item.Icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 capitalize">{item.category}</p>
                        <p className="text-xs text-slate-500">${item.amount.toLocaleString()} donated</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600">{item.estimated}+</p>
                      <p className="text-xs text-slate-500">{item.unit}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Your Charitable Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { threshold: 100, label: 'First Steps', achieved: totalDonated >= 100 },
              { threshold: 500, label: 'Generous Giver', achieved: totalDonated >= 500 },
              { threshold: 1000, label: 'Major Donor', achieved: totalDonated >= 1000 },
              { threshold: 5000, label: 'Philanthropist', achieved: totalDonated >= 5000 }
            ].map((milestone, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  milestone.achieved
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-slate-50 border-slate-200 opacity-50'
                }`}
              >
                <Award className={`w-8 h-8 mx-auto mb-2 ${milestone.achieved ? 'text-amber-600' : 'text-slate-400'}`} />
                <p className="font-semibold text-sm text-slate-800">{milestone.label}</p>
                <p className="text-xs text-slate-600">${milestone.threshold}+</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}