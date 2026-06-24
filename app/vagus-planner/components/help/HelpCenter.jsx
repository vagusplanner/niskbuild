import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  HelpCircle, 
  Calendar, 
  Sparkles, 
  Bell, 
  Users, 
  Settings, 
  Moon,
  ChevronRight,
  BookOpen,
  MessageCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Calendar,
    color: 'teal',
    faqs: [
      {
        question: 'How do I create my first event?',
        answer: 'Click the "New Event" button on the Calendar page. Fill in the event details like title, date, time, and location. You can also add reminders and invite others. Click Save when done.'
      },
      {
        question: 'How do I navigate between different calendar views?',
        answer: 'Use the view selector buttons above the calendar to switch between Month, Week, Day, Agenda, and Timeline views. Each view offers different ways to visualize your schedule.'
      },
      {
        question: 'Can I sync my Google Calendar?',
        answer: 'Yes! Go to Settings > External Calendar Sync, connect your Google account, and enable bi-directional sync. Your events will automatically sync between VAGUS PLANNER and Google Calendar.'
      }
    ]
  },
  {
    id: 'ai-features',
    title: 'AI Features',
    icon: Sparkles,
    color: 'purple',
    faqs: [
      {
        question: 'What is AI-powered scheduling?',
        answer: 'Our AI analyzes your calendar, preferences, and availability to suggest optimal times for new events. It avoids conflicts, considers your work patterns, and even respects your prayer times if enabled.'
      },
      {
        question: 'How does the Smart Meeting Scheduler work?',
        answer: 'Enter meeting details and attendees, and AI will analyze everyone\'s availability to suggest the best meeting times. It considers time zones, working hours, and existing commitments.'
      },
      {
        question: 'Can AI help me parse email invites?',
        answer: 'Yes! When creating an event, paste an email with meeting details. AI will automatically extract the title, date, time, location, and participants to fill in the form.'
      },
      {
        question: 'What are proactive suggestions?',
        answer: 'AI monitors your schedule and proactively suggests optimizations like rescheduling conflicting events, blocking focus time, or recommending breaks between meetings. Enable this in Settings > AI Assistant.'
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    color: 'amber',
    faqs: [
      {
        question: 'How do I customize notification settings?',
        answer: 'Go to Settings > Notifications. You can enable/disable push and email notifications, set default reminder times, configure Do Not Disturb hours, and choose notification sounds.'
      },
      {
        question: 'Can I get email notifications for important events?',
        answer: 'Yes! Enable "Email Notifications" in Settings. You\'ll receive emails for high-priority events, upcoming deadlines, and critical alerts. Regular notifications will appear in-app only.'
      },
      {
        question: 'What is Do Not Disturb mode?',
        answer: 'DND mode silences all notifications during specified hours (e.g., 10 PM to 8 AM). Enable it in Settings > Notifications and set your preferred quiet hours.'
      },
      {
        question: 'How do event reminders work?',
        answer: 'You can set multiple reminders per event (5 mins, 30 mins, 1 hour, 1 day before). Default reminder time is configurable in Settings. Reminders trigger both in-app and via email if enabled.'
      }
    ]
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    icon: Users,
    color: 'blue',
    faqs: [
      {
        question: 'How do I share events with others?',
        answer: 'Click the Share icon on any event card. You can share with specific users or entire teams. Recipients will see the event in their calendar and can add comments.'
      },
      {
        question: 'What is the Social Scheduler?',
        answer: 'Social Scheduler helps you find time for casual meetups with friends. AI analyzes everyone\'s availability and suggests optimal times for social activities based on preferences and location.'
      },
      {
        question: 'Can I create team calendars?',
        answer: 'Yes! Go to Chat & Teams, create a team, and add members. You can share events with the entire team, schedule group meetings, and see combined availability.'
      }
    ]
  },
  {
    id: 'islamic-features',
    title: 'Islamic Features',
    icon: Moon,
    color: 'violet',
    faqs: [
      {
        question: 'How do I enable prayer times?',
        answer: 'Go to Settings > Prayer Times Settings, enable prayer times, select your calculation method, and set your location. Prayer times will appear on your calendar automatically.'
      },
      {
        question: 'Can I track Ramadan activities?',
        answer: 'Yes! Navigate to Islamic > Ramadan Dashboard. You can track fasting, Quran reading, prayers, and participate in daily challenges. Earn badges and compete on the leaderboard.'
      },
      {
        question: 'What is the Hajj/Umrah Planner?',
        answer: 'The planner helps you prepare for pilgrimage with AI-guided itineraries, visa information, ritual trackers, and group coordination tools. Find it under Islamic > Hajj & Umrah.'
      },
      {
        question: 'How do I use the Quran Reader?',
        answer: 'Access the Quran Reader from Islamic > Quran. Choose your preferred translation and reciter, set reading goals, track progress, and use the memorization tracker to learn verses.'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    icon: Settings,
    color: 'slate',
    faqs: [
      {
        question: 'How do I change the theme?',
        answer: 'Go to Settings > Appearance and select Light, Dark, or Auto mode. Auto mode follows your system preference. The theme updates instantly.'
      },
      {
        question: 'Can I change the language?',
        answer: 'Yes! Settings > Language Preferences supports English, Arabic, French, Turkish, and Urdu. The interface updates immediately after selection.'
      },
      {
        question: 'What calendar views are available?',
        answer: 'VAGUS PLANNER offers Month, Week, Day, Agenda, and Timeline views. Set your default view in Settings > Calendar Preferences. You can switch views anytime using the view selector.'
      },
      {
        question: 'How do I customize AI assistant behavior?',
        answer: 'In Settings > AI Assistant, you can adjust communication tone (professional, friendly, casual), response length (brief, medium, detailed), and enable/disable proactive suggestions.'
      }
    ]
  }
];

export default function HelpCenter({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  if (!isOpen) return null;

  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  const activeCategoryData = selectedCategory 
    ? FAQ_CATEGORIES.find(c => c.id === selectedCategory)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-600 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Help Center</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Find answers to common questions</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Categories Sidebar */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Categories</h3>
              <div className="space-y-1">
                {FAQ_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSearchQuery('');
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                        isActive 
                          ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" 
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{category.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.faqs.length}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Quick Links */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Documentation
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1 p-6">
              {selectedCategory ? (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 bg-${activeCategoryData.color}-100 dark:bg-${activeCategoryData.color}-900/30 rounded-lg`}>
                      {React.createElement(activeCategoryData.icon, { 
                        className: `w-5 h-5 text-${activeCategoryData.color}-600 dark:text-${activeCategoryData.color}-400` 
                      })}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {activeCategoryData.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activeCategoryData.faqs.length} articles
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeCategoryData.faqs.map((faq, idx) => (
                      <Card 
                        key={idx}
                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-800/50 dark:border-slate-700"
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 flex-1">
                              {faq.question}
                            </CardTitle>
                            <ChevronRight className={cn(
                              "w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2",
                              expandedFaq === idx && "rotate-90"
                            )} />
                          </div>
                        </CardHeader>
                        <AnimatePresence>
                          {expandedFaq === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CardContent className="pt-0">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : searchQuery ? (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Search Results for "{searchQuery}"
                  </h3>
                  {filteredCategories.length > 0 ? (
                    <div className="space-y-6">
                      {filteredCategories.map(category => (
                        <div key={category.id}>
                          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                            {category.title}
                          </h4>
                          <div className="space-y-2">
                            {category.faqs.map((faq, idx) => (
                              <Card 
                                key={idx}
                                className="cursor-pointer hover:shadow-md transition-shadow dark:bg-slate-800/50 dark:border-slate-700"
                                onClick={() => {
                                  setSelectedCategory(category.id);
                                  setSearchQuery('');
                                }}
                              >
                                <CardHeader>
                                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                    {faq.question}
                                  </CardTitle>
                                  <CardDescription className="line-clamp-2 dark:text-slate-400">
                                    {faq.answer}
                                  </CardDescription>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400">No results found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">Select a category to get started</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">or use the search bar to find specific answers</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}