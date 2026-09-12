import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Plane,
  Heart,
  Settings,
  Moon,
  ChevronRight,
  MessageCircle,
  X,
  Home,
  Target,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPPORT_EMAIL = 'support@vagusplanner.com';

/**
 * FAQ content for App Store v1 — only features that are nav-visible today.
 * Islamic category is omitted when islamicMode is false (same gate as the Islam tab).
 */
export function buildFaqCategories(islamicMode) {
  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Home,
      color: 'teal',
      faqs: [
        {
          question: 'Where do I start after signing in?',
          answer:
            'Home (Dashboard) shows your day at a glance — greeting, quick capture, and shortcuts into Calendar, Goals, Travel or Islam, Wellness, and Account. Use the gold + button (FAB) at the bottom for quick-add, voice capture, and AI help from any screen.',
        },
        {
          question: 'What is the floating + / AI button?',
          answer:
            'The Unified FAB (bottom corner) opens quick actions: add an event or task, voice capture, and page-aware AI. Expand it, pick an action, and describe what you need in plain language when prompted.',
        },
        {
          question: 'How do I switch Standard vs Islamic Edition?',
          answer:
            'Open Account → Preferences → Edition. Islamic Edition needs an active Islamic subscription plan (see Account → Subscription & Billing). Turning it on shows the Islam tab and Islamic-themed features; Standard keeps Travel in the main nav instead.',
        },
      ],
    },
    {
      id: 'calendar',
      title: 'Calendar & Tasks',
      icon: Calendar,
      color: 'blue',
      faqs: [
        {
          question: 'How do I create an event or task?',
          answer:
            'Open Calendar and use New Event / New Task, or use the FAB quick-add. Fill in title, date/time, and optional reminders. Tasks can also live in the Calendar task panel alongside events.',
        },
        {
          question: 'How do calendar views work?',
          answer:
            'Use the view controls on Calendar to switch between month, week, day, and agenda-style layouts. Filters let you focus on events, tasks, or other sources when available.',
        },
        {
          question: 'How do I connect Google Calendar?',
          answer:
            'Go to Account → Preferences → Calendar Integrations. Connect Google, then use Pull to import events from your primary Google Calendar into Vagus Planner. Sync is one-way (Google → Vagus Planner, read-only) — it does not push Vagus events back to Google.',
        },
      ],
    },
    {
      id: 'goals-wellness',
      title: 'Goals & Wellness',
      icon: Heart,
      color: 'rose',
      faqs: [
        {
          question: 'Where are Goals?',
          answer:
            'Goals is in the main desktop nav and under Tools on mobile. Create life goals, track progress, and open related views from the Goals page.',
        },
        {
          question: 'What is on the Wellness hub?',
          answer:
            'Wellness groups Health coaching tools, habits, goal progress, journal, finance insights, and productivity helpers. Open Wellness from the mobile tab bar or Tools, then tap a tile for that area.',
        },
      ],
    },
    {
      id: 'travel',
      title: 'Travel',
      icon: Plane,
      color: 'amber',
      faqs: [
        {
          question: 'What can I do on Travel?',
          answer:
            'Travel covers My Trips, AI packing lists, the AI itinerary planner, import/scan tools (including Gmail booking scan where available), safety tools, and travel alerts. In Standard mode Travel is a primary nav tab; in Islamic mode open it from Tools.',
        },
        {
          question: 'How does the AI trip planner work?',
          answer:
            'Open Travel → AI Planner. Describe your trip and let the planner suggest an itinerary. You can also manage trips under My Trips and generate packing lists under Packing.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Account & Billing',
      icon: Settings,
      color: 'slate',
      faqs: [
        {
          question: 'What are the five Account areas?',
          answer:
            'Account is organised into exactly five places: Personal Info (name & photo), Security (password guidance, 2FA, sign-out), Preferences (edition, notifications, theme, language, dietary/calendar, Google Calendar), Subscription & Billing (plan, usage, invoices), and Privacy & Data (consents, export, account deletion).',
        },
        {
          question: 'How do I change theme or language?',
          answer:
            'Account → Preferences. Appearance toggles light/dark for the whole app. Language changes the UI language (and RTL where needed) and may reload to apply translations.',
        },
        {
          question: 'Where are notification settings?',
          answer:
            'Account → Preferences → Notifications. Push/in-app preferences, journal reminders, and billing email alerts are all there — not under a separate Settings page.',
        },
        {
          question: 'How do I manage my subscription?',
          answer:
            'Account → Subscription & Billing shows your plan, usage, and invoices. You can upgrade from there or from the Billing page. Islamic plans unlock the Islamic Edition toggle in Preferences.',
        },
        {
          question: 'How do I export or delete my data?',
          answer:
            'Account → Privacy & Data. Use consent controls and data export there. Account deletion is only in this tab (one clear flow) — confirm carefully; deletion is permanent.',
        },
      ],
    },
    {
      id: 'ai',
      title: 'AI Features',
      icon: Sparkles,
      color: 'purple',
      faqs: [
        {
          question: 'How do I use AI to add something to my schedule?',
          answer:
            'Open the FAB, choose AI / quick-add, and describe the event or task in natural language (for example: “Team meeting tomorrow at 2pm for one hour”). The assistant fills details for you to confirm.',
        },
        {
          question: 'Does AI work the same in Islamic mode?',
          answer:
            'Yes for core scheduling and travel help. In Islamic Edition, calendar and Islam tools can also reflect prayer-aware context where those features are enabled.',
        },
      ],
    },
  ];

  if (islamicMode) {
    categories.splice(4, 0, {
      id: 'islamic',
      title: 'Islamic Features',
      icon: Moon,
      color: 'violet',
      faqs: [
        {
          question: 'Where is the Islam tab?',
          answer:
            'With Islamic Edition on (Account → Preferences) and an active Islamic plan, Islam appears in the main nav (and replaces Travel on the mobile tab bar). Open it for Prayer, Quran, Du’a/Dhikr/Hadith, Zakat, pilgrimage guides, Hijri tools, and mosque finder — each as a hub tile.',
        },
        {
          question: 'How do prayer times work?',
          answer:
            'Open Islam → Prayer for times, logging, and related tools. Times use your location and calculation preferences. When Islamic mode is on, prayer-related overlays can also appear on Calendar.',
        },
        {
          question: 'Where are Quran, Zakat, and Du’a tools?',
          answer:
            'All live under the Islam hub: Quran for reading and progress, Zakat & Finance for calculators and related tools, and Du’a / Dhikr & Hadith for libraries and helpers. Open each tile from the Islam home grid.',
        },
        {
          question: 'Is Travel still available in Islamic mode?',
          answer:
            'Yes — open Travel from Tools. Trips, packing, and AI planner stay available; an extra Islamic travel tab can appear for halal/prayer-abroad helpers when Islamic Edition is active.',
        },
      ],
    });
  }

  return categories;
}

export default function HelpCenter({ isOpen, onClose, islamicMode = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqCategories = useMemo(() => buildFaqCategories(!!islamicMode), [islamicMode]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory(null);
      setExpandedFaq(null);
      return;
    }
    // Drop Islamic selection if user switched edition while modal was closed
    if (selectedCategory === 'islamic' && !islamicMode) {
      setSelectedCategory(null);
    }
  }, [isOpen, islamicMode, selectedCategory]);

  if (!isOpen) return null;

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          searchQuery === '' ||
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  const activeCategoryData = selectedCategory
    ? faqCategories.find((c) => c.id === selectedCategory)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Tips and Help"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-teal-600 rounded-lg flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                    Tips &amp; Help
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    How Vagus Planner works today
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close help">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search tips…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
                className="pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">
            <div className="sm:w-56 lg:w-64 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-3 sm:p-4 overflow-x-auto sm:overflow-y-auto flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 hidden sm:block">
                Categories
              </h3>
              <div className="flex sm:flex-col gap-1">
                {faqCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSearchQuery('');
                        setExpandedFaq(null);
                      }}
                      className={cn(
                        'flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap sm:w-full',
                        isActive
                          ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{category.title}</span>
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {category.faqs.length}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 sm:p-6">
              {selectedCategory && activeCategoryData ? (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                      {React.createElement(activeCategoryData.icon, {
                        className: 'w-5 h-5 text-teal-600 dark:text-teal-400',
                      })}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                        {activeCategoryData.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activeCategoryData.faqs.length} tips
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeCategoryData.faqs.map((faq, idx) => (
                      <Card
                        key={faq.question}
                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-800/50 dark:border-slate-700"
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 flex-1">
                              {faq.question}
                            </CardTitle>
                            <ChevronRight
                              className={cn(
                                'w-5 h-5 text-slate-400 transition-transform flex-shrink-0',
                                expandedFaq === idx && 'rotate-90'
                              )}
                            />
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
                    Results for &quot;{searchQuery}&quot;
                  </h3>
                  {filteredCategories.length > 0 ? (
                    <div className="space-y-6">
                      {filteredCategories.map((category) => (
                        <div key={category.id}>
                          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                            {category.title}
                          </h4>
                          <div className="space-y-2">
                            {category.faqs.map((faq) => (
                              <Card
                                key={faq.question}
                                className="cursor-pointer hover:shadow-md transition-shadow dark:bg-slate-800/50 dark:border-slate-700"
                                onClick={() => {
                                  setSelectedCategory(category.id);
                                  setSearchQuery('');
                                  setExpandedFaq(null);
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
                <div className="text-center py-10 sm:py-12 px-4">
                  <HelpCircle className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    Choose a category or search
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mx-auto">
                    Tips cover Calendar, Travel, Account, Wellness, and
                    {islamicMode ? ' Islamic features' : ' AI'} — only what is available in the app
                    right now.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSelectedCategory('calendar')}
                    >
                      <Calendar className="w-3.5 h-3.5" /> Calendar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSelectedCategory('account')}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Account
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setSelectedCategory('getting-started')}
                    >
                      <Target className="w-3.5 h-3.5" /> Getting started
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/80 dark:bg-slate-950/40">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need a person? Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <Link
              to="/Contact"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              Open Contact form
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
