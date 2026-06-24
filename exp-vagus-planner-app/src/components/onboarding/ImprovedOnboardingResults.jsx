import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, CheckCircle2, TrendingUp, Target, Zap, Trophy, Gift, Moon, Calendar } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export default function ImprovedOnboardingResults({ onboardingData, onComplete }) {
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    generatePersonalizedPlan();
    celebrateCompletion();
  }, []);

  const celebrateCompletion = () => {
    // Confetti celebration
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#14b8a6', '#06b6d4', '#10b981', '#f59e0b']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#14b8a6', '#06b6d4', '#10b981', '#f59e0b']
      });
    }, 250);
  };

  const generatePersonalizedPlan = async () => {
    try {
      // Get current user
      const user = await SDK.auth.me();

      // First, populate sample data and send welcome email
      await Promise.all([
        SDK.functions.invoke('populateSampleData', {}),
        SDK.functions.invoke('sendWelcomeEmail', {
          user_email: user.email,
          user_name: user.full_name
        })
      ]);

      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Based on this user's onboarding preferences, generate a personalized welcome plan:
        
Location: ${onboardingData.location_city || 'Not specified'}, ${onboardingData.location_country || 'Not specified'}
Work Style: ${onboardingData.work_style || 'Not specified'}
Focus Areas: ${onboardingData.focus_areas?.join(', ') || 'Not specified'}
Travel Interests: ${onboardingData.travel_interests?.join(', ') || 'None'}
Dietary Preferences: ${onboardingData.dietary_preferences?.join(', ') || 'None'}
Prayer Times Enabled: ${onboardingData.prayer_enabled}

Generate:
1. A personalized welcome message (2-3 sentences)
2. Top 3 recommended features they should try first (with emoji icons)
3. A motivational tip for getting started
4. A "quick win" they can achieve today

Make it friendly, personal, and Islamic-focused if prayer is enabled.`,
        response_json_schema: {
          type: 'object',
          properties: {
            welcome_message: { type: 'string' },
            recommended_features: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            },
            motivational_tip: { type: 'string' },
            quick_win: { type: 'string' }
          }
        }
      });

      setAiSuggestions(result);
      setSetupComplete(true);
      
      toast.success('🎉 Setup complete! Check your email for more tips.');
    } catch (error) {
      console.error('Failed to generate personalized plan:', error);
      setAiSuggestions({
        welcome_message: "Welcome to MyAssistant! We're excited to have you here.",
        recommended_features: [
          { icon: '📅', title: 'Smart Calendar', description: 'Manage your events and schedule' },
          { icon: '🕌', title: 'Prayer Times', description: 'Never miss a prayer' },
          { icon: '🤖', title: 'AI Assistant', description: 'Get intelligent suggestions' }
        ],
        motivational_tip: 'Start by exploring the calendar and adding your first event!',
        quick_win: 'Check today\'s prayer times and set up reminders'
      });
      setSetupComplete(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Creating your personalized experience...</p>
          <p className="text-sm text-slate-400 mt-2">Setting up sample data, sending welcome email...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Achievement Badge */}
          {setupComplete && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
            >
              <Card className="p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200 text-center">
                <Trophy className="w-16 h-16 text-amber-600 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-amber-900 mb-2">🏆 Early Adopter Badge Unlocked!</h3>
                <p className="text-amber-800">You've earned 100 points for completing onboarding</p>
              </Card>
            </motion.div>
          )}

          {/* Welcome Message */}
          <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-teal-900 mb-2">
                  Your Journey Starts Now! 🎉
                </h3>
                <p className="text-teal-800 leading-relaxed">
                  {aiSuggestions?.welcome_message}
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Win */}
          {aiSuggestions?.quick_win && (
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-1">⚡ Quick Win Today</h3>
                  <p className="text-green-800 text-sm">{aiSuggestions.quick_win}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Welcome Email Notification */}
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-purple-600" />
              <p className="text-sm text-purple-800">
                <strong>📧 Check your inbox!</strong> We've sent you a welcome email with helpful tips and resources.
              </p>
            </div>
          </Card>

          {/* Recommended Features */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-teal-600" />
              Recommended for You
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {aiSuggestions?.recommended_features?.map((feature, idx) => (
                <Card key={idx} className="p-5 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h4 className="font-bold text-slate-800 mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Motivational Tip */}
          {aiSuggestions?.motivational_tip && (
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">💡 Pro Tip</h4>
                  <p className="text-sm text-blue-800">{aiSuggestions.motivational_tip}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Sample Data Notice */}
          <Card className="p-5 bg-slate-50 border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3">✨ We've set up some examples for you:</h4>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-slate-700">3 sample events on your calendar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span className="text-slate-700">2 starter tasks to complete</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-teal-600" />
                <span className="text-slate-700">Today's Quran verse</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700">Your first achievement badge</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Feel free to edit or delete these examples anytime!</p>
          </Card>

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button
              size="lg"
              onClick={onComplete}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 px-8"
            >
              Start Using MyAssistant
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}