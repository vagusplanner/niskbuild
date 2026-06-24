import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  Heart,
  BookOpen,
  Plane,
  Activity,
  Moon,
  TrendingUp,
  Loader2,
  Calendar,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import AIAssistantSchedulingPanel from './AIAssistantSchedulingPanel';

const iconMap = {
  BookOpen,
  Plane,
  Activity,
  Moon,
  Heart,
  TrendingUp,
  Sparkles
};

export default function ProactiveAICompanion() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has dismissed for this session
    return sessionStorage.getItem('ai-companion-dismissed') === 'true';
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current page name from location
  const currentPage = location.pathname.split('/')[1] || 'Calendar';

  // Shared cache key with UnifiedAIAssistant — React Query deduplicates the call
  const { data: assistance, isLoading } = useQuery({
    queryKey: ['ai-assistance', currentPage],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generateContextualAIAssistance', {
        current_page: currentPage,
        user_action: 'viewing page'
      });
      return response.data;
    },
    enabled: !isDismissed,
    refetchInterval: 10 * 60 * 1000, // 10 minutes — reduces background calls
    staleTime: 5 * 60 * 1000
  });

  // Show companion after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDismissed && assistance?.success) {
        setIsVisible(true);
      }
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [isDismissed, currentPage, assistance]);

  // Only reset minimized state when page changes, keep dismissed state
  useEffect(() => {
    setIsMinimized(false);
  }, [currentPage]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('ai-companion-dismissed', 'true');
  };

  const handleFeatureClick = (pageLink) => {
    navigate(createPageUrl(pageLink));
    handleDismiss();
  };

  if (isDismissed || !assistance?.success || isLoading) {
    return null;
  }

  const { feature_suggestions, contextual_guidance, encouragement, priority } = assistance.assistance;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-24 right-4 md:right-6 z-40 w-[calc(100vw-2rem)] max-w-96 pointer-events-auto"
        >
          <Card className="shadow-2xl border-2 border-teal-200 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/30 backdrop-blur-sm">
            {/* Header */}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-teal-900">
                      AI Companion
                    </CardTitle>
                    <p className="text-xs text-teal-600">Here to help you</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-7 w-7 text-teal-600"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-90' : 'rotate-270'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-7 w-7 text-teal-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="space-y-4 pb-4">
                {/* Contextual Guidance */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Moon className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-purple-900 mb-1">
                        {contextual_guidance.title}
                      </h4>
                      <p className="text-xs text-purple-800 leading-relaxed">
                        {contextual_guidance.message}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Feature Suggestions */}
                {feature_suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-semibold text-slate-700">Suggested for you:</p>
                    {feature_suggestions.map((suggestion, idx) => {
                      const Icon = iconMap[suggestion.icon] || Sparkles;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleFeatureClick(suggestion.page_link)}
                          className="w-full p-2.5 bg-white hover:bg-teal-50 rounded-lg border border-teal-200 transition-all text-left group"
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-teal-900 mb-0.5">
                                {suggestion.feature_name}
                              </div>
                              <div className="text-xs text-teal-700">
                                {suggestion.reason}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-teal-400 group-hover:text-teal-600 transition-colors flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {/* AI Scheduling Actions */}
                {feature_suggestions?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <AIAssistantSchedulingPanel 
                      suggestions={feature_suggestions}
                      compact 
                    />
                  </motion.div>
                )}

                {/* Encouragement */}
                {encouragement.message && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
                  >
                    <div className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-emerald-800 leading-relaxed mb-2">
                          {encouragement.message}
                        </p>
                        {encouragement.verse_reference && (
                          <div className="text-xs text-emerald-700 italic">
                            "{encouragement.verse_text}" - {encouragement.verse_reference}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Priority Badge */}
                {priority === 'high' && (
                  <div className="flex justify-center">
                    <Badge className="bg-amber-100 text-amber-800 text-xs">
                      ⚡ Time-sensitive suggestion
                    </Badge>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}