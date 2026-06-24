import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Sparkles, X, Send, Loader2, Calendar, Plane,
  Heart, Moon, TrendingUp, ChevronRight, Zap, Target,
  CheckCircle, AlertCircle, MapPin, DollarSign, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Page-specific quick actions
const PAGE_CONTEXTS = {
  Calendar: {
    icon: Calendar,
    color: 'from-blue-500 to-cyan-600',
    title: 'Calendar AI',
    quickActions: [
      { label: 'Find free slot today', prompt: 'Show me free 1-hour slots today that avoid prayer times' },
      { label: 'Suggest meeting times', prompt: 'When can I schedule a 30-min meeting this week?' },
      { label: 'Optimize my schedule', prompt: 'Review my week and suggest improvements' },
      { label: 'Block focus time', prompt: 'Find 2 hours for deep work tomorrow morning' },
    ]
  },
  Travel: {
    icon: Plane,
    color: 'from-amber-500 to-orange-600',
    title: 'Travel AI',
    quickActions: [
      { label: 'Plan a trip', prompt: 'Help me plan a 5-day trip to Morocco' },
      { label: 'Find halal food', prompt: 'Find halal restaurants near my destination' },
      { label: 'Create itinerary', prompt: 'Build a day-by-day itinerary for my upcoming trip' },
      { label: 'Travel checklist', prompt: 'What should I pack and prepare?' },
    ]
  },
  Wellness: {
    icon: Heart,
    color: 'from-rose-500 to-pink-600',
    title: 'Wellness AI',
    quickActions: [
      { label: 'Health insights', prompt: 'Analyze my sleep and mood patterns this week' },
      { label: 'Suggest habits', prompt: 'What healthy habit should I build next?' },
      { label: 'Goal review', prompt: 'Review my wellness goals and suggest actions' },
      { label: 'Workout plan', prompt: 'Create a 30-day fitness routine for me' },
    ]
  },
  Islam: {
    icon: Moon,
    color: 'from-purple-500 to-indigo-600',
    title: 'Islamic AI',
    quickActions: [
      { label: 'Prayer insights', prompt: 'How can I improve my prayer consistency?' },
      { label: 'Quran study plan', prompt: 'Create a 30-day Quran reading schedule' },
      { label: 'Daily dua', prompt: 'Suggest a dua for my current situation' },
      { label: 'Ramadan prep', prompt: 'Help me prepare for Ramadan spiritually' },
    ]
  },
  PrayerScheduler: {
    icon: Moon,
    color: 'from-amber-500 to-yellow-600',
    title: 'Prayer Scheduling AI',
    quickActions: [
      { label: 'Optimize prayer timing', prompt: 'When should I pray to avoid meeting conflicts?' },
      { label: 'Mosque recommendations', prompt: 'Find nearby mosques for Jummah' },
      { label: 'Prayer habits', prompt: 'Track my prayer consistency this month' },
    ]
  },
  Finance: {
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-600',
    title: 'Finance AI',
    quickActions: [
      { label: 'Budget analysis', prompt: 'How am I doing against my budget this month?' },
      { label: 'Spending insights', prompt: 'Where am I spending the most money?' },
      { label: 'Savings goals', prompt: 'Help me create a savings plan' },
      { label: 'Zakat estimate', prompt: 'Calculate my Zakat obligation' },
    ]
  },
  Dashboard: {
    icon: Sparkles,
    color: 'from-[#E8B84B] to-[#f0c060]',
    title: 'Personal AI',
    quickActions: [
      { label: 'Plan my day', prompt: 'What should I focus on today?' },
      { label: 'Weekly summary', prompt: 'Summarize my productivity this week' },
      { label: 'Quick insights', prompt: 'Any urgent tasks or events I should know about?' },
      { label: 'Balance check', prompt: 'Am I balancing work, health, and spirituality well?' },
    ]
  }
};

const DEFAULT_CONTEXT = {
  icon: Brain,
  color: 'from-[#E8B84B] to-[#f0c060]',
  title: 'AI Assistant',
  quickActions: [
    { label: 'Get started', prompt: 'What can you help me with?' },
    { label: 'Show insights', prompt: 'Give me insights on my data' },
  ]
};

export default function UnifiedContextSidebar({ isOpen, onClose, forcePage = null }) {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef(null);

  // Determine current page context
  const currentPage = forcePage || location.pathname.split('/').pop() || 'Dashboard';
  const context = PAGE_CONTEXTS[currentPage] || DEFAULT_CONTEXT;
  const Icon = context.icon;

  // Fetch user data for context
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list('-start_date', 50),
    enabled: isOpen
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list('-updated_date', 30),
    enabled: isOpen
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.list('-created_date', 20),
    enabled: isOpen
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
    enabled: isOpen
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => SDK.entities.Expense.list('-date', 50),
    enabled: isOpen && currentPage === 'Wellness'
  });

  // Build context string
  const buildContext = () => {
    const ctx = [`You are an AI assistant for Vagus Planner on the ${currentPage} page.`];
    
    if (currentPage === 'Calendar') {
      ctx.push(`Today's events: ${events.filter(e => {
        const d = new Date(e.start_date);
        return d.toDateString() === new Date().toDateString();
      }).length}`);
      ctx.push(`Upcoming: ${events.slice(0, 5).map(e => e.title).join(', ')}`);
    }
    
    if (currentPage === 'Wellness') {
      ctx.push(`Active goals: ${goals.filter(g => g.status === 'in_progress').length}`);
      ctx.push(`Tasks: ${tasks.filter(t => t.status !== 'completed').length} pending`);
      if (expenses.length > 0) {
        const monthSpending = expenses.filter(e => e.type === 'expense').slice(0, 10).reduce((s, e) => s + e.amount, 0);
        ctx.push(`Recent spending: $${monthSpending.toFixed(0)}`);
      }
    }

    if (currentPage === 'Travel') {
      ctx.push(`Help with trip planning, itineraries, halal food, and travel logistics.`);
    }

    if (currentPage === 'Islam' || currentPage === 'PrayerScheduler') {
      ctx.push(`Provide Islamic guidance, prayer scheduling, Quran insights, and spiritual advice.`);
      if (settings[0]?.islamic_mode) {
        ctx.push(`User has Islamic mode enabled.`);
      }
    }

    return ctx.join(' ');
  };

  const sendMessage = async (msg = input) => {
    if (!msg.trim()) return;

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextStr = buildContext();
      const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const prompt = `${contextStr}

Conversation history:
${conversationHistory}

User: ${msg}

Provide a helpful, concise response (max 150 words). Be specific and actionable.`;

      const result = await SDK.integrations.Core.InvokeLLM({ prompt });
      
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset on page change
  React.useEffect(() => {
    setMessages([]);
    setInput('');
  }, [currentPage]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[58]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-[59] flex flex-col"
      >
        {/* Header */}
        <div className={`p-4 bg-gradient-to-r ${context.color} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{context.title}</h2>
              <p className="text-xs opacity-80">Context-aware assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {context.quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.prompt)}
                  disabled={loading}
                  className="text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 group"
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {context.title} Ready
              </p>
              <p className="text-xs text-slate-400">
                Tap a quick action or ask anything about your {currentPage.toLowerCase()}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === 'user'
                  ? 'bg-gradient-to-r ' + context.color + ' text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              )}>
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder={`Ask about your ${currentPage.toLowerCase()}...`}
              className="flex-1"
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={cn('bg-gradient-to-r', context.color)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            AI adapts to your current page context
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}