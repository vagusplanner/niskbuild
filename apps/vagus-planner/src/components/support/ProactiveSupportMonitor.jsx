import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Bot, ThumbsUp, ThumbsDown, X, Lightbulb, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ProactiveSupportMonitor() {
  const [showProactiveHelp, setShowProactiveHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState('');
  const [feedbackTrigger, setFeedbackTrigger] = useState(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(null);

  const { data: recentActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const [tasks, events, prayerLogs, settings] = await Promise.all([
        base44.entities.Task.list('-created_date', 1),
        base44.entities.Event.list('-created_date', 1),
        base44.entities.PrayerLog.list('-date', 1),
        base44.entities.UserSettings.list()
      ]);
      return { tasks, events, prayerLogs, settings: settings[0] };
    },
    refetchInterval: 30000 // Check every 30 seconds
  });

  const submitFeedback = useMutation({
    mutationFn: async (feedbackData) => {
      return await base44.entities.SupportTicket.create({
        subject: `Feedback: ${feedbackData.trigger}`,
        description: feedbackData.feedback,
        category: 'feature_request',
        status: 'closed',
        satisfaction_rating: feedbackData.rating,
        conversation_history: [{
          role: 'system',
          message: `Proactive feedback collected after ${feedbackData.trigger}`,
          timestamp: new Date().toISOString()
        }]
      });
    },
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setShowFeedback(false);
      setUserFeedback('');
      setFeedbackRating(null);
    }
  });

  // Monitor user activity and offer proactive help
  useEffect(() => {
    if (!recentActivity) return;

    const checkForHelpOpportunities = () => {
      const { tasks, events, prayerLogs, settings } = recentActivity;

      // Detect if user created first task
      if (tasks.length === 1 && !localStorage.getItem('shown_task_help')) {
        setProactiveMessage('🎯 Great job creating your first task! Did you know you can set recurring tasks and share them with team members? Need help?');
        setShowProactiveHelp(true);
        localStorage.setItem('shown_task_help', 'true');
        return;
      }

      // Detect if user created event but hasn't set reminders
      if (events.length > 0) {
        const latestEvent = events[0];
        if (!latestEvent.reminders || latestEvent.reminders.length === 0) {
          if (!localStorage.getItem('shown_reminder_help')) {
            setProactiveMessage('⏰ I noticed you created an event without reminders. Would you like help setting up smart reminders?');
            setShowProactiveHelp(true);
            localStorage.setItem('shown_reminder_help', 'true');
            return;
          }
        }
      }

      // Detect if prayer tracking is disabled but user seems interested
      if (settings && !settings.prayer_enabled && prayerLogs.length === 0) {
        if (!localStorage.getItem('shown_prayer_help')) {
          setProactiveMessage('🕌 I see you have the Islamic features available. Would you like help setting up prayer times and tracking?');
          setShowProactiveHelp(true);
          localStorage.setItem('shown_prayer_help', 'true');
          return;
        }
      }

      // Detect if user has many pending tasks
      const pendingTasks = tasks.filter(t => t.status === 'todo').length;
      if (pendingTasks > 10 && !localStorage.getItem('shown_task_management_help')) {
        setProactiveMessage('📋 You have quite a few pending tasks! Would you like tips on prioritizing and organizing them effectively?');
        setShowProactiveHelp(true);
        localStorage.setItem('shown_task_management_help', 'true');
        return;
      }
    };

    const timer = setTimeout(checkForHelpOpportunities, 3000);
    return () => clearTimeout(timer);
  }, [recentActivity]);

  // Trigger feedback collection after feature usage
  useEffect(() => {
    const handleFeatureUsage = (event) => {
      const { feature } = event.detail;
      
      // Wait 5 seconds after feature usage, then ask for feedback
      setTimeout(() => {
        setFeedbackTrigger(feature);
        setShowFeedback(true);
      }, 5000);
    };

    window.addEventListener('feature_used', handleFeatureUsage);
    return () => window.removeEventListener('feature_used', handleFeatureUsage);
  }, []);

  const handleDismissHelp = () => {
    setShowProactiveHelp(false);
    // Mark as seen to avoid re-showing too soon
    const dismissCount = parseInt(localStorage.getItem('help_dismiss_count') || '0');
    localStorage.setItem('help_dismiss_count', (dismissCount + 1).toString());
  };

  const handleAcceptHelp = () => {
    setShowProactiveHelp(false);
    // Trigger the main support chat
    window.dispatchEvent(new CustomEvent('open_support_chat'));
  };

  const handleSubmitFeedback = () => {
    if (!feedbackRating) {
      toast.error('Please rate your experience');
      return;
    }

    submitFeedback.mutate({
      trigger: feedbackTrigger,
      feedback: userFeedback || 'No additional feedback provided',
      rating: feedbackRating
    });
  };

  return (
    <>
      {/* Proactive Help Toast */}
      <AnimatePresence>
        {showProactiveHelp && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 20 }}
            className="fixed bottom-24 right-6 z-50 w-96"
          >
            <Card className="p-4 shadow-2xl border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    {proactiveMessage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAcceptHelp}
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Get Help
                    </Button>
                    <Button
                      onClick={handleDismissHelp}
                      size="sm"
                      variant="ghost"
                      className="text-slate-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              How was your experience?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You just used: <strong>{feedbackTrigger}</strong>
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setFeedbackRating(5)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  feedbackRating === 5
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 ${feedbackRating === 5 ? 'text-teal-600' : 'text-slate-400'}`} />
                <p className="text-xs mt-2 font-medium">Great</p>
              </button>
              
              <button
                onClick={() => setFeedbackRating(1)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  feedbackRating === 1
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-red-300'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 ${feedbackRating === 1 ? 'text-red-600' : 'text-slate-400'}`} />
                <p className="text-xs mt-2 font-medium">Needs Work</p>
              </button>
            </div>

            <Textarea
              placeholder="Any additional thoughts? (optional)"
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              rows={3}
              className="resize-none"
            />

            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setShowFeedback(false)}
                variant="ghost"
              >
                Skip
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                disabled={!feedbackRating || submitFeedback.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}