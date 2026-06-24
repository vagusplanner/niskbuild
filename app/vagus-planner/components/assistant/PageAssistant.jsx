import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Loader2, Sparkles, 
  Mic, Volume2, VolumeX, Minimize2, Maximize2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import VoiceInterface from './VoiceInterface';

export default function PageAssistant({ 
  pageName = "Calendar",
  context = {},
  quickActions = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [lastAssistantMessage, setLastAssistantMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage(pageName);
      setMessages([{
        role: 'assistant',
        content: welcomeMessage
      }]);
    }
  }, [isOpen, pageName]);

  const getWelcomeMessage = (page) => {
    const messages = {
      Calendar: "Hi! I'm your calendar assistant. I can help manage events, meetings, and schedules. What would you like to do?",
      Islamic: "As-salamu alaykum! I can help with prayer times, Quran reading, Ramadan tracking, and Islamic learning. How can I assist?",
      Health: "Hi! I'm here to help track your health, mood, exercise, nutrition, and wellness goals. What would you like to know?",
      Holidays: "Hi! I can help plan trips, manage budgets, create itineraries, and track travel details. Where are you headed?",
      Chat: "Hi! I can help manage conversations, schedule meetings with teams, and improve your communication. How can I help?",
      Gamification: "Hi! I'm here to explain your achievements, challenges, and progress. Let's boost your motivation!",
      Profile: "Hi! I can help set goals, track progress, and improve your personal development. What's on your mind?",
      Settings: "Hi! I can help configure your preferences, notifications, integrations, and app settings. What would you like to change?"
    };
    return messages[page] || "Hi! How can I assist you today?";
  };

  const handleSend = async (message = input) => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let currentConvId = conversationId;
      if (!currentConvId) {
        const conversation = await base44.agents.createConversation({
          agent_name: "calendar_assistant",
          metadata: {
            name: `${pageName} Assistant Chat`,
            description: `AI assistant for ${pageName} page`,
            page: pageName,
            context
          }
        });
        currentConvId = conversation.id;
        setConversationId(currentConvId);
      }

      const conversation = await base44.agents.getConversation(currentConvId);
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: `[Context: User is on ${pageName} page] ${message}`
      });

      const unsubscribe = base44.agents.subscribeToConversation(currentConvId, (data) => {
        const lastMessage = data.messages[data.messages.length - 1];
        const formattedMessages = data.messages.map(msg => ({
          role: msg.role,
          content: msg.content || '',
          tool_calls: msg.tool_calls
        }));
        setMessages(formattedMessages);
        
        if (lastMessage?.role === 'assistant' && lastMessage.content) {
          setLastAssistantMessage(lastMessage.content);
        }
        
        if (lastMessage?.role === 'assistant' && !lastMessage.tool_calls?.some(tc => tc.status === 'running')) {
          setIsLoading(false);
          queryClient.invalidateQueries();
        }
      });

      setTimeout(() => unsubscribe(), 30000);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Ask AI Assistant</span>
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`bg-white rounded-xl shadow-lg border border-teal-100 overflow-hidden ${
          isMinimized ? 'h-14' : 'h-[400px]'
        } transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-emerald-100">{pageName} Page</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-auto p-3 space-y-3 h-[280px]">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-2.5 rounded-xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && quickActions.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex flex-wrap gap-1.5">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                      disabled={isLoading}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t">
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
                  placeholder="Type or speak..."
                  className="flex-1 h-9 text-sm"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 h-9"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}