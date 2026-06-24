import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Calendar, Heart, Users, CheckCircle2, 
  ArrowRight, Clock, Zap, Target, TrendingUp, Loader2
} from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { createPageUrl } from '../../utils';
import { Link } from 'react-router-dom';

const ICON_MAP = {
  calendar: Calendar,
  health: Heart,
  social: Users,
  sparkles: Sparkles,
  clock: Clock,
  zap: Zap,
  target: Target
};

export default function OnboardingResults({ onboardingData, onComplete }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedQuickWins, setCompletedQuickWins] = useState([]);

  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = async () => {
    try {
      const response = await SDK.functions.invoke('generatePersonalizedOnboarding', {
        onboarding_data: onboardingData
      });
      setRecommendations(response.data.recommendations);
    } catch (error) {
      toast.error('Failed to generate recommendations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuickWin = (index) => {
    setCompletedQuickWins(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-800">Creating Your Personalized Setup</h3>
              <p className="text-sm text-slate-600 mt-1">Our AI is analyzing your preferences...</p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto p-6 pb-20">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            You're All Set! 🎉
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {recommendations.welcome_message}
          </p>
        </motion.div>

        {/* Top Features to Explore */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-teal-600" />
            Start Here: Top Features for You
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations.top_features.map((feature, idx) => {
              const Icon = ICON_MAP[feature.icon?.toLowerCase()] || Sparkles;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <Icon className="w-6 h-6 text-teal-600" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          #{idx + 1}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{feature.feature_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">{feature.reason}</p>
                      <Link to={createPageUrl(feature.page)}>
                        <Button className="w-full bg-teal-600 hover:bg-teal-700">
                          {feature.action_label}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Wins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Quick Wins (Do These Now!)
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recommendations.quick_wins.map((win, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleQuickWin(idx)}
                      className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        completedQuickWins.includes(idx)
                          ? 'bg-teal-600 border-teal-600'
                          : 'border-slate-300 hover:border-teal-400'
                      }`}
                    >
                      {completedQuickWins.includes(idx) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-slate-800 mb-1 ${
                        completedQuickWins.includes(idx) ? 'line-through text-slate-400' : ''
                      }`}>
                        {win.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">{win.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {win.action}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Setup Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Calendar Setup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Your Optimal Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Work Hours</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {recommendations.calendar_setup.work_hours.start} - {recommendations.calendar_setup.work_hours.end}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Recommended Breaks</p>
                  {recommendations.calendar_setup.break_times.map((breakTime, idx) => (
                    <div key={idx} className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">{breakTime.type}</span>
                      <span className="font-medium">{breakTime.time} ({breakTime.duration}min)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Health Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Health Tracking Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.health_recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-slate-700">{rec.category}</p>
                        <Badge variant="secondary" className="text-xs">{rec.frequency}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{rec.suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Automation Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Smart Automations We'll Set Up
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.automations.map((automation, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-2">{automation.name}</h3>
                  <p className="text-sm text-slate-600 mb-2">{automation.description}</p>
                  <div className="flex items-center gap-2 text-sm text-teal-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{automation.benefit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={onComplete}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8"
          >
            Let's Get Started!
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            You can always adjust these settings in the Settings page
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}