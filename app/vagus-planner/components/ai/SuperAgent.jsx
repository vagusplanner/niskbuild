import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, X, Sparkles, Calendar, Moon, Heart, Plane,
  TrendingUp, Brain, Zap, MessageCircle, Loader2, ChevronDown,
  Clock, MapPin, Book, Target, Activity, Plus, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';

// Context-aware agent roles based on current page
const AGENT_ROLES = {
  Dashboard: { icon: Sparkles, name: 'Daily Planner', color: 'from-blue-500 to-cyan-500', prompts: ['What should I focus on today?', 'Review my schedule', 'Show upcoming deadlines'] },
  Calendar: { icon: Calendar, name: 'Calendar Coach', color: 'from-purple-500 to-pink-500', prompts: ['Schedule a meeting', 'Find free time this week', 'Optimize my calendar'] },
  Islam: { icon: Moon, name: 'Islamic Guide', color: 'from-amber-500 to-yellow-500', prompts: ['Next prayer time?', 'Daily Quran verse', 'Zakat calculation'] },
  Wellness: { icon: Heart, name: 'Health Coach', color: 'from-rose-500 to-pink-500', prompts: ['Track my mood', 'Suggest a workout', 'Review my sleep'] },
  Travel: { icon: Plane, name: 'Travel Assistant', color: 'from-teal-500 to-cyan-500', prompts: ['Plan my next trip', 'Find halal restaurants', 'Book flights'] },
  Finance: { icon: TrendingUp, name: 'Finance Advisor', color: 'from-green-500 to-emerald-500', prompts: ['Monthly spending?', 'Set a budget', 'Track expenses'] },
};

export default function SuperAgent({ isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const queryClient = useQueryClient();

  const currentPage = location.pathname.split('/')[1] || 'Dashboard';
  const agentRole = AGENT_ROLES[currentPage] || AGENT_ROLES.Dashboard;
  const Icon = agentRole.icon;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date', 10),
    enabled: isOpen
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 20),
    enabled: isOpen
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 10),
    enabled: isOpen
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Context builder — tells AI about current page state
  const buildContext = () => {
    const today = new Date().toISOString().split('T')[0];
    let context = `Current page: ${currentPage}\nUser: ${user?.full_name || user?.email}\nToday: ${today}\n`;
    
    if (currentPage === 'Calendar') {
      const upcoming = events.filter(e => e.start_date >= today).slice(0, 5);
      context += `\nUpcoming events:\n${upcoming.map(e => `- ${e.title} on ${e.start_date}`).join('\n')}`;
    }
    
    if (currentPage === 'Wellness' || currentPage === 'Dashboard') {
      const activeTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);
      context += `\nActive tasks:\n${activeTasks.map(t => `- ${t.title} (${t.priority})`).join('\n')}`;
    }

    if (currentPage === 'Wellness') {
      const activeGoals = goals.filter(g => g.status === 'in_progress').slice(0, 3);
      context += `\nActive goals:\n${activeGoals.map(g => `- ${g.title} (${g.progress}% complete)`).join('\n')}`;
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const context = buildContext();
      const prompt = `You are ${agentRole.name}, an AI assistant in the Vagus Planner app.

CONTEXT:
${context}

USER QUERY:
${input}

INSTRUCTIONS:
- Be helpful, concise, and action-oriented
- If the user asks to create/schedule something, confirm you'll do it
- Reference specific data from context when relevant
- End with a clear next step or question

Respond in 2-3 sentences max unless the user asks for detail.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      const aiMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, aiMessage]);

      // Auto-actions based on intent detection
      if (input.toLowerCase().includes('schedule') || input.toLowerCase().includes('create event')) {
        toast.info('🗓️ Open Calendar to finalize event details');
      }
      if (input.toLowerCase().includes('add task') || input.toLowerCase().includes('create task')) {
        toast.info('✅ Open your task list to add details');
      }

    } catch (error) {
      console.error('SuperAgent error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    setTimeout(() => handleSend(), 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[48] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className={`relative overflow-hidden bg-gradient-to-r ${agentRole.color} p-4 sm:rounded-t-2xl`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white">{agentRole.name}</h3>
                  <p className="text-xs text-white/70">AI Assistant · {currentPage}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agentRole.color} mx-auto mb-4 flex items-center justify-center`}>
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Hi {user?.full_name?.split(' ')[0] || 'there'}!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">I'm your {agentRole.name}. How can I help you today?</p>
                
                {showQuickActions && (
                  <div className="space-y-2 max-w-xs mx-auto">
                    {agentRole.prompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-left text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${agentRole.name}...`}
                className="flex-1 h-11"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`h-11 px-4 bg-gradient-to-r ${agentRole.color} text-white hover:opacity-90`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}