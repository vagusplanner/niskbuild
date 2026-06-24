import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function AISupportChat({ isOpen, onClose }) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage) => {
      const { data } = await base44.functions.invoke('supportChatbot', {
        message: userMessage,
        conversationHistory: conversation
      });
      return data;
    },
    onSuccess: (data) => {
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: data.message,
          should_escalate: data.should_escalate,
          escalation_reason: data.escalation_reason,
          suggested_actions: data.suggested_actions,
          related_pages: data.related_pages
        }
      ]);
    },
    onError: () => {
      toast.error('Failed to get response. Please try again.');
    }
  });

  const handleEscalate = async () => {
    try {
      await base44.entities.SupportTicket.create({
        subject: 'Support Request from Chat',
        description: conversation.map(msg => 
          `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
        ).join('\n\n'),
        status: 'open',
        priority: 'medium'
      });
      toast.success('Support ticket created. We\'ll get back to you soon!');
      onClose();
      setConversation([]);
    } catch (error) {
      toast.error('Failed to create support ticket');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;

    const userMessage = message.trim();
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessage('');
    chatMutation.mutate(userMessage);
  };

  const handleQuickQuestion = (question) => {
    setConversation([{ role: 'user', content: question }]);
    chatMutation.mutate(question);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[49] lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed inset-x-0 bottom-0 z-[50] lg:bottom-6 lg:right-6 lg:left-auto lg:inset-x-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
          <Card className="w-full lg:w-[380px] h-[85vh] lg:h-[560px] flex flex-col shadow-2xl rounded-t-2xl lg:rounded-2xl overflow-hidden">
            {/* Mobile drag handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 lg:hidden flex-shrink-0" />
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Support Assistant</h3>
                  <p className="text-xs text-slate-600">Billing, Features & Help</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {conversation.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Ask me anything about billing, features, or troubleshooting!
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickQuestion('How do I upgrade my plan?')}
                      className="block w-full text-left px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      💳 How do I upgrade my plan?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('What features are included in the Pro plan?')}
                      className="block w-full text-left px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      ⭐ What features are in Pro?
                    </button>
                    <button
                      onClick={() => handleQuickQuestion('How do prayer times work?')}
                      className="block w-full text-left px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      🕌 How do prayer times work?
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        
                        {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
                            <p className="text-xs font-semibold mb-2">Suggested actions:</p>
                            {msg.suggested_actions.map((action, i) => (
                              <p key={i} className="text-xs">• {action}</p>
                            ))}
                          </div>
                        )}
                        
                        {msg.related_pages && msg.related_pages.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.related_pages.map((page, i) => (
                              <a
                                key={i}
                                href={createPageUrl(page)}
                                className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-50"
                              >
                                {page} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {msg.should_escalate && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <div className="flex items-start gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-red-600">Human support recommended</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{msg.escalation_reason}</p>
                              </div>
                            </div>
                            <Button
                              onClick={handleEscalate}
                              size="sm"
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                              Create Support Ticket
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t bg-slate-50 dark:bg-slate-900">
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  className="resize-none"
                  rows={2}
                  disabled={chatMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || chatMutation.isPending}
                  className="flex-shrink-0 bg-teal-600 hover:bg-teal-700"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {conversation.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConversation([])}
                  className="text-xs text-slate-500 hover:text-slate-700 mt-2"
                >
                  Clear conversation
                </button>
              )}
            </form>
          </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}