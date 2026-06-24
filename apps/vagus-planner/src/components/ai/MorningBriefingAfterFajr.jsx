import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Calendar, CheckSquare, Moon, Book, Zap, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function MorningBriefingAfterFajr() {
  const [show, setShow] = useState(false);
  const [briefing, setBriefing] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  useEffect(() => {
    const checkAndShowBriefing = async () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Don't show if user disabled it
      if (localStorage.getItem('morning_briefing_disabled')) return;

      // Show briefing after Fajr (5:30 AM - 8:00 AM)
      if (hour >= 5 && hour < 8) {
        const lastShown = localStorage.getItem('last_morning_briefing');
        const today = now.toDateString();
        
        if (lastShown !== today) {
          // Generate briefing
          const { data } = await base44.functions.invoke('generateMorningBriefing', {});
          
          if (data.success) {
            setBriefing(data.briefing);
            setShow(true);
            localStorage.setItem('last_morning_briefing', today);
          }
        }
      }
    };

    if (user) {
      checkAndShowBriefing();
    }
  }, [user]);

  const dismiss = () => setShow(false);

  const dontShowAgain = () => {
    localStorage.setItem('morning_briefing_disabled', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && briefing && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-2 sm:inset-4 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-auto z-[150] w-auto md:w-full md:max-w-2xl max-h-[90vh] overflow-y-auto safe-area-top safe-area-bottom"
          >
            <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-2xl h-full md:h-auto overflow-y-auto max-h-[90vh]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl">
                    <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">As-salamu ʿalaykum ☀️</h2>
                    <p className="text-xs sm:text-sm text-slate-600">Your day ahead after Fajr</p>
                  </div>
                  <button
                    onClick={dismiss}
                    className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                {/* Summary */}
                {briefing.summary && (
                  <div className="p-3 sm:p-4 bg-white rounded-lg border border-amber-200">
                    <p className="text-sm sm:text-base text-slate-700">{briefing.summary}</p>
                  </div>
                )}

                {/* Today's Events */}
                {briefing.events && briefing.events.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                      <h4 className="text-sm sm:text-base font-semibold text-slate-800">Today's Events</h4>
                      <Badge className="bg-amber-100 text-amber-800 text-xs">
                        {briefing.events.length}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {briefing.events.map((event, idx) => (
                        <div key={idx} className="p-2 sm:p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-2 sm:gap-3">
                          <div className="text-[10px] sm:text-xs text-slate-500 font-medium w-12 sm:w-16">
                            {event.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">{event.title}</p>
                            {event.category && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs mt-1">
                                {event.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Tasks */}
                {briefing.pending_tasks && briefing.pending_tasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                      <h4 className="font-semibold text-slate-800">Priority Tasks</h4>
                    </div>
                    <div className="space-y-2">
                      {briefing.pending_tasks.slice(0, 3).map((task, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-slate-200">
                          <p className="text-sm text-slate-700">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Islamic Reminders */}
                {briefing.islamic_reminders && briefing.islamic_reminders.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-semibold text-slate-800">Islamic Reminders</h4>
                    </div>
                    <ul className="space-y-1">
                      {briefing.islamic_reminders.map((reminder, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                          <span className="text-emerald-600">•</span>
                          {reminder}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Tip */}
                {briefing.ai_tip && (
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-slate-800">AI Tip</h4>
                    </div>
                    <p className="text-sm text-slate-700">{briefing.ai_tip}</p>
                  </div>
                )}

                <Button onClick={dismiss} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 min-h-[48px] text-sm sm:text-base">
                  Start Your Day 🚀
                </Button>
                <button
                  onClick={dontShowAgain}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
                >
                  Don't show again
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}