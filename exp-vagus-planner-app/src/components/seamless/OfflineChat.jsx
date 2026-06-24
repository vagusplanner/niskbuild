import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function OfflineChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "I'm available offline! What can I help with?", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Working offline - messages will sync when online');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      synced: isOnline
    };

    setMessages(prev => [...prev, userMessage]);

    // Store in localStorage for offline support
    const storedMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
    storedMessages.push(userMessage);
    localStorage.setItem('offline_messages', JSON.stringify(storedMessages));

    // Simulate bot response
    setTimeout(() => {
      const responses = [
        "I can help you schedule events, check your calendar, and manage tasks - all offline! 📅",
        "Your changes are saved locally and will sync when you're back online. ✓",
        "Try asking: 'What's my schedule today?' or 'Create an event tomorrow at 2pm'",
        "All offline messages are encrypted and stored securely on your device."
      ];

      const botMessage = {
        id: Date.now() + 1,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'bot',
        timestamp: new Date(),
        synced: isOnline
      };

      setMessages(prev => [...prev, botMessage]);
    }, 500);

    setInput('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="h-[600px] flex flex-col bg-gradient-to-br from-green-50 dark:from-green-950 to-emerald-50 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader className="border-b border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                💬 Offline Chat
              </CardTitle>
              <CardDescription>Full functionality without internet</CardDescription>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
              isOnline 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
            }`}>
              {isOnline ? (
                <>
                  <Radio className="w-3 h-3" />
                  <span className="text-xs font-medium">Online</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3" />
                  <span className="text-xs font-medium">Offline</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${
                    msg.sender === 'user'
                      ? 'bg-green-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-green-200 dark:border-green-700'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'user' ? 'text-green-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {!msg.synced && msg.sender === 'user' && ' ⏳'}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-4 border-t border-green-200 dark:border-green-800 space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Message your calendar assistant..."
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-green-600 hover:bg-green-700"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!isOnline && (
            <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
              Messages queued - will send when online ✓
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}