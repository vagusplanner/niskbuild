import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Loader2, Sparkles, 
  Calendar, Users, HelpCircle, Lightbulb, Plus, Target, Plane, 
  CheckSquare, CheckCircle2, Settings
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import VoiceInterface from './VoiceInterface';
import AIGoalsManager from './AIGoalsManager';

// Quick actions are defined inside the component to use translations


export default function AssistantChat() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const QUICK_ACTIONS = [
    { label: t('dashboard.todayOverview'), icon: Calendar },
    { label: t('calendar.addEvent'), icon: Users },
    { label: t('tasks.title'), icon: CheckSquare },
    { label: t('wellness.goals'), icon: Target }
  ];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState('');
  const [showGoalsManager, setShowGoalsManager] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch user settings and AI goals for personalization
  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const userSettings = settings[0] || {};

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['activeAIGoals'],
    queryFn: async () => {
      const goals = await SDK.entities.AIPersonalization.list();
      return goals.filter(g => g.is_active);
    },
    enabled: isOpen
  });

  // Fetch upcoming events for context-aware suggestions
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const events = await SDK.entities.Event.list();
      const now = new Date();
      return events
        .filter(e => new Date(e.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 5);
    },
    enabled: isOpen
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect language from user input
  const detectLanguage = (text) => {
    const arabicRegex = /[\u0600-\u06FF]/g;
    const urduRegex = /[\u0600-\u06FF]/g;
    const frenchRegex = /[àâäçèéêëìîïòôöùûüœæ]/gi;
    const turkishRegex = /[çğıöşüÇĞİÖŞÜ]/g;
    
    const arabicCount = (text.match(arabicRegex) || []).length;
    const frenchCount = (text.match(frenchRegex) || []).length;
    const turkishCount = (text.match(turkishRegex) || []).length;
    
    if (arabicCount > text.length * 0.3) return 'ar';
    if (frenchCount > text.length * 0.1) return 'fr';
    if (turkishCount > text.length * 0.05) return 'tr';
    
    return userSettings.language || 'en';
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const tone = userSettings.ai_response_tone || 'friendly';
      const lang = userSettings.language || 'en';
      
      // Use i18n for greeting (will be in user's preferred language)
      const greeting = t('assistant.greeting') || "Hi! I'm your personalized AI assistant. How can I help you today?";
      
      setMessages([{
        role: 'assistant',
        content: greeting
      }]);
      setDetectedLanguage(lang);
    }
  }, [isOpen, activeGoals, upcomingEvents, userSettings, t]);

  const handleSend = async (message = input) => {
    if (!message.trim() || isLoading) return;

    // Detect user's message language in real-time
    const messageLanguage = detectLanguage(message);
    setDetectedLanguage(messageLanguage);

    // Build personalized context
    const tone = userSettings.ai_response_tone || 'friendly';
    const length = userSettings.ai_response_length || 'medium';
    const language = messageLanguage; // Use detected language, not just settings
    let systemContext = `[AI Instructions: Respond in a ${tone} tone with ${length} detail level.`;
    
    // Add language preference - respond in detected message language
    const languageMap = { en: 'English', ar: 'Arabic', fr: 'French', tr: 'Turkish', ur: 'Urdu' };
    systemContext += `\nRespond in the user's message language: ${languageMap[language] || 'English'}.`;
    
    // Add user goals context
    if (activeGoals.length > 0) {
      systemContext += `\nUser's Active Goals: ${activeGoals.map(g => `${g.goal_type}: ${g.goal_description}`).join('; ')}.`;
      systemContext += `\nConsider these goals when providing suggestions and recommendations.`;
    }
    
    // Add calendar context
    if (upcomingEvents.length > 0) {
      systemContext += `\nUpcoming Events: ${upcomingEvents.map(e => `"${e.title}" at ${e.start_date}${e.location ? ` (${e.location})` : ''}`).join('; ')}.`;
      systemContext += `\nBe proactive about suggesting prayer times, travel considerations, and preparation for meetings.`;
    }
    
    // Add location and prayer settings context
    if (userSettings.location_city) {
      systemContext += `\nUser Location: ${userSettings.location_city}, ${userSettings.location_country}.`;
    }
    if (userSettings.prayer_enabled) {
      systemContext += `\nPrayer times are enabled. User follows ${userSettings.prayer_method || 'MWL'} calculation method.`;
    }
    
    systemContext += `]`;
    
    const enhancedMessage = `${systemContext}\n\n${message}`;

    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create or get conversation
      let currentConvId = conversationId;
      if (!currentConvId) {
        const conversation = await SDK.agents.createConversation({
          agent_name: "calendar_assistant",
          metadata: {
            name: "Calendar Chat",
            description: "AI assistant conversation"
          }
        });
        currentConvId = conversation.id;
        setConversationId(currentConvId);
      }

      // Get conversation and add message with timeout handling
      try {
        const conversation = await SDK.agents.getConversation(currentConvId);
        await SDK.agents.addMessage(conversation, {
          role: "user",
          content: enhancedMessage
        });
      } catch (err) {
        console.warn('Message send warning:', err);
        // Continue even if there's a minor issue, the subscription will still work
      }

      // Subscribe to updates
      const unsubscribe = SDK.agents.subscribeToConversation(currentConvId, (data) => {
        if (!isOpen) return; // Don't update if chat closed
        
        const lastMessage = data.messages[data.messages.length - 1];
        const formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content || '',
          tool_calls: msg.tool_calls
        }));
        setMessages(formattedMessages);
        
        // Update last assistant message for voice output
        if (lastMessage?.role === 'assistant' && lastMessage.content) {
          setLastAssistantMessage(lastMessage.content);
        }
        
        // Stop loading when assistant finishes
        if (lastMessage?.role === 'assistant' && !lastMessage.tool_calls?.some(tc => tc.status === 'running')) {
          setIsLoading(false);
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          queryClient.invalidateQueries({ queryKey: ['meetings'] });
          queryClient.invalidateQueries({ queryKey: ['holidays'] });
        }
      });

      unsubscribeRef.current = unsubscribe;
      
      // Cleanup subscription after 2 minutes (allow longer for slow networks)
      const timeout = setTimeout(() => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      }, 120000);
      
      return () => clearTimeout(timeout);

    } catch (error) {
      // Silently ignore aborted requests (user navigated away, closed chat, etc.)
      if (error?.message?.includes('aborted') || error?.code === 'ECONNABORTED') {
        setIsLoading(false);
        return;
      }
      console.error('Assistant error:', error);
      const errorMsg = t('assistant.error') || 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        className="fixed right-4 z-[44] w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-[#1a4a6e] to-[#3ecfa0] rounded-full shadow-lg shadow-[#3ecfa0]/30 flex items-center justify-center text-white hover:scale-105 transition-transform lg:bottom-6 ring-2 ring-[#E8B84B]/60"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed right-4 z-[48] w-[360px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{
              bottom: 'calc(8.5rem + env(safe-area-inset-bottom))',
              height: 'min(500px, calc(100dvh - 180px))',
            }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0] text-white flex items-center justify-between border-b-2 border-[#E8B84B]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-semibold">{t('assistant.title') || 'AI Assistant'}</h3>
                   <p className="text-xs text-emerald-100">
                     {activeGoals.length > 0 ? `${activeGoals.length} ${t('assistant.activeGoals') || 'active goal'}${activeGoals.length > 1 ? 's' : ''}` : t('assistant.personalizedForYou') || 'Personalized for you'}
                   </p>
                 </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowGoalsManager(true)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Manage AI Goals"
                >
                  <Target className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-white dark:bg-slate-900">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown className="text-sm prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
                          {msg.content}
                        </ReactMarkdown>
                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.tool_calls.map((tool, tidx) => (
                              <div key={tidx} className="text-xs text-slate-600 flex items-center gap-1 bg-white/50 rounded px-2 py-1">
                                {tool.status === 'completed' ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                )}
                                <span>{tool.name?.split('.').pop()?.replace('_', ' ') || 'Action'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1a7ab8]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 bg-white dark:bg-slate-900">
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action.label)}
                      className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                      disabled={isLoading}
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <VoiceInterface
                  onTranscript={(text) => handleSend(text)}
                  isAssistantSpeaking={isLoading}
                  assistantMessage={lastAssistantMessage}
                />
                <Input
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   placeholder={t('assistant.placeholder') || 'Type or speak...'}
                   className="flex-1"
                   disabled={isLoading}
                 />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-[#1a7ab8] to-[#3ecfa0] hover:opacity-90 border border-[#E8B84B]/30"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Goals Manager */}
      <AIGoalsManager 
        isOpen={showGoalsManager} 
        onClose={() => {
          setShowGoalsManager(false);
          queryClient.invalidateQueries({ queryKey: ['activeAIGoals'] });
        }} 
      />
    </>
  );
}