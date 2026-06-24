import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SDK } from '@/lib/custom-sdk.js';
import { cn } from '@/lib/utils';

export default function AIOnboardingAssistant({ userProfile, currentStep, onboardingData, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Generate contextual AI guidance based on current step
  const generateGuidance = async (step, data) => {
    if (completedSteps.includes(step)) return;

    setIsThinking(true);
    
    try {
      const context = {
        currentStep: step,
        userProfile: userProfile || {},
        onboardingData: data || {},
        completedSteps
      };

      const prompt = `You are a friendly AI onboarding assistant for a comprehensive personal calendar and life management app with Islamic features, health tracking, travel planning, and productivity tools.

Current Context:
- Step: ${step}
- User Profile: ${JSON.stringify(userProfile || {})}
- Completed Steps: ${completedSteps.join(', ') || 'None yet'}

Based on the current step, provide:
1. A warm, encouraging message (2-3 sentences)
2. One specific tip or insight related to this step
3. A suggested action the user should take next

Be conversational, supportive, and specific. Reference the user's choices when relevant.`;

      const response = await SDK.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            tip: { type: 'string' },
            action: { type: 'string' },
            emoji: { type: 'string' }
          }
        }
      });

      setMessages(prev => [...prev, {
        ...response,
        step,
        timestamp: new Date().toISOString()
      }]);

      setCompletedSteps(prev => [...prev, step]);
    } catch (error) {
      console.error('AI guidance generation failed:', error);
      // Fallback messages
      const fallbackMessages = {
        welcome: {
          message: "Welcome! I'm here to help you get the most out of your new personal assistant app.",
          tip: "Take your time exploring - you can always customize settings later.",
          action: "Let's start by setting up your basic preferences.",
          emoji: "👋"
        },
        preferences: {
          message: "Great choices! These preferences will help personalize your experience.",
          tip: "Your location helps us show accurate prayer times and local events.",
          action: "Now let's set up your calendar view preferences.",
          emoji: "⚙️"
        },
        calendar: {
          message: "Your calendar is the heart of this app - everything connects here!",
          tip: "You can switch between month, week, and day views anytime.",
          action: "Try adding your first event to see how easy it is.",
          emoji: "📅"
        },
        islamic: {
          message: "The Islamic features integrate seamlessly with your daily schedule.",
          tip: "Prayer times will automatically appear on your calendar.",
          action: "Enable prayer notifications to stay connected throughout the day.",
          emoji: "🕌"
        },
        complete: {
          message: "You're all set! You've unlocked the full potential of your personal assistant.",
          tip: "Check the AI Dashboard for personalized insights about your schedule.",
          action: "Start exploring and make this app truly yours!",
          emoji: "🎉"
        }
      };

      setMessages(prev => [...prev, {
        ...fallbackMessages[step] || fallbackMessages.welcome,
        step,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  // Trigger guidance when step changes
  useEffect(() => {
    if (currentStep && !completedSteps.includes(currentStep)) {
      generateGuidance(currentStep, onboardingData);
    }
  }, [currentStep]);

  // Proactive tips based on user actions
  const offerProactiveTip = async (context) => {
    setIsThinking(true);
    
    try {
      const prompt = `The user just ${context}. Provide a brief, encouraging tip (1 sentence) that helps them get more value from this action. Be specific and actionable.`;
      
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            tip: { type: 'string' },
            emoji: { type: 'string' }
          }
        }
      });

      setMessages(prev => [...prev, {
        message: '',
        tip: response.tip,
        action: '',
        emoji: response.emoji,
        step: 'proactive',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Proactive tip generation failed:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const currentMessage = messages[messages.length - 1];

  return (
    <AnimatePresence>
      {currentMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
        >
          <Card className={cn(
            "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 border-purple-200 dark:border-purple-800 shadow-2xl overflow-hidden",
            isMinimized && "h-16"
          )}>
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  {isThinking && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0"
                    >
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
                    </motion.div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Guide</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isThinking ? 'Thinking...' : 'Here to help'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                >
                  {isMinimized ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4"
              >
                <div className="space-y-4">
                  {/* Main Message */}
                  {currentMessage.message && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{currentMessage.emoji}</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                        {currentMessage.message}
                      </p>
                    </div>
                  )}

                  {/* Tip */}
                  {currentMessage.tip && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                            Pro Tip
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {currentMessage.tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggested Action */}
                  {currentMessage.action && (
                    <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-indigo-800 dark:text-indigo-200 mb-1">
                            Next Step
                          </p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            {currentMessage.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Indicator */}
                  {completedSteps.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {completedSteps.length} steps completed
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}