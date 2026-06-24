import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles, X, Calendar, Plane, Star, Activity, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FloatingButton, useFloatingManager } from '@/components/ui/floating-manager';

const PAGE_CONTEXTS = {
  '/Schedule': {
    icon: Calendar,
    color: 'blue',
    examples: [
      'Schedule lunch tomorrow at 1pm',
      'What meetings do I have today?',
      'Plan a trip to Paris next month',
      'Show my availability this week'
    ],
    capabilities: ['schedule events', 'check calendar', 'plan trips', 'manage holidays', 'find conflicts']
  },
  '/Wellness': {
    icon: Activity,
    color: 'teal',
    examples: [
      'When is Maghrib prayer today?',
      'Log my sleep from last night',
      'Show Quran verse of the day',
      'Track my exercise today'
    ],
    capabilities: ['prayer times', 'Quran verses', 'health tracking', 'spiritual wellness', 'fitness logs']
  },
  '/Connect': {
    icon: MessageCircle,
    color: 'purple',
    examples: [
      'Send message to team',
      'Create group chat for project',
      'Check unread messages',
      'Share my availability'
    ],
    capabilities: ['send messages', 'manage chats', 'collaboration tools', 'meeting coordination']
  }
};

export default function UnifiedContextAwareAssistant() {
  const location = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const queryClient = useQueryClient();
  const { openFloating, closeFloating } = useFloatingManager();

  // Get user settings for AI behavior
  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  const userSettings = (settings && settings.length > 0) ? settings[0] : {};

  // Detect current page context
  const currentContext = PAGE_CONTEXTS[location.pathname] || {
    icon: Sparkles,
    color: 'indigo',
    examples: [
      'What can you help me with?',
      'Show my schedule for today',
      'Add a reminder',
      'What\'s my next event?'
    ],
    capabilities: ['general assistance', 'schedule management', 'reminders', 'quick answers']
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            processCommand(transcriptText);
          }, 500);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error('Voice recognition error. Please try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setResult(null);
      setShowResult(false);
      setIsListening(true);
      recognitionRef.current.start();
      openFloating('voice');
      toast.info('🎤 Listening... Speak your command');
    } else {
      toast.error('Voice recognition not supported in this browser');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      closeFloating();
    }
  };

  const processCommand = async (command) => {
    setProcessing(true);
    
    try {
      // Build context-aware prompt
      const contextInfo = {
        current_page: location.pathname,
        page_capabilities: currentContext.capabilities,
        user_tone: userSettings.ai_response_tone || 'friendly',
        response_length: userSettings.ai_response_length || 'medium'
      };

      const response = await base44.functions.invoke('voiceCommandProcessor', {
        command,
        context: contextInfo
      });

      setResult(response.data);
      setShowResult(true);
      
      // Speak the response
      if ('speechSynthesis' in window && response.data?.response) {
        const utterance = new SpeechSynthesisUtterance(response.data.response);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }

      // Invalidate relevant queries based on context
      if (location.pathname === '/Calendar') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else if (location.pathname === '/Holidays') {
        queryClient.invalidateQueries({ queryKey: ['holidays'] });
      } else if (location.pathname === '/Islamic') {
        queryClient.invalidateQueries({ queryKey: ['prayerLogs'] });
      }

      toast.success('Command executed successfully!');
      
      setTimeout(() => {
        setShowResult(false);
      }, 5000);

    } catch (error) {
      console.error('Command processing failed:', error);
      toast.error('Failed to process command');
      setResult({ error: true, response: 'Sorry, I couldn\'t process that command.' });
      setShowResult(true);
    } finally {
      setProcessing(false);
      setTranscript('');
    }
  };

  const ContextIcon = currentContext.icon;

  return (
    <>
      <FloatingButton id="voice" position="bottom-right" stackOrder={1}>
        <Button
          size="lg"
          onClick={isListening ? stopListening : startListening}
          onMouseEnter={() => !isListening && !processing && setShowHints(true)}
          onMouseLeave={() => setShowHints(false)}
          disabled={processing}
          data-tour="voice-assistant"
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl transition-all relative group",
            isListening
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : `bg-gradient-to-br from-${currentContext.color}-600 to-${currentContext.color}-700 hover:from-${currentContext.color}-700 hover:to-${currentContext.color}-800`
          )}
        >
          {processing ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <ContextIcon className="w-5 h-5 text-white" />
          )}
          
          {isListening && (
            <span className="absolute -inset-2 rounded-full bg-red-400 animate-ping opacity-75" />
          )}
        </Button>
      </FloatingButton>

      {/* Live Transcript Display */}
      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-[102] lg:bottom-6 lg:right-24 max-w-[calc(100vw-3rem)]"
          >
            <Card className="p-4 max-w-sm shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-teal-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", `bg-${currentContext.color}-100`)}>
                  <Mic className={cn("w-4 h-4", `text-${currentContext.color}-600`)} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-600 mb-1">
                    {isListening ? 'Listening...' : 'Processing...'}
                  </p>
                  <p className="text-sm text-slate-800">
                    {transcript || 'Speak your command...'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Display */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[102] lg:bottom-6 lg:right-24 max-w-[calc(100vw-3rem)]"
          >
            <Card className={cn(
              "p-5 max-w-md shadow-2xl border-2",
              result.error 
                ? "bg-red-50 border-red-200" 
                : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  result.error ? "bg-red-100" : "bg-green-100"
                )}>
                  {result.error ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium mb-2",
                    result.error ? "text-red-900" : "text-green-900"
                  )}>
                    {result.response}
                  </p>
                  
                  {result.action_result && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">Action Taken:</p>
                      <p className="text-xs text-slate-700">
                        {typeof result.action_result === 'string' 
                          ? result.action_result 
                          : JSON.stringify(result.action_result, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowResult(false)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context-Aware Hints */}
      <AnimatePresence>
        {showHints && !isListening && !transcript && !showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-24 z-[99] lg:bottom-6 lg:right-24 max-w-[320px]"
          >
            <Card className="p-4 shadow-2xl bg-slate-800 text-white border-slate-700">
              <div className="flex items-start gap-3">
                <ContextIcon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", `text-${currentContext.color}-400`)} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">
                      {location.pathname.replace('/', '')} Assistant
                    </p>
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  </div>
                  
                  <p className="text-xs mb-2 text-slate-300">Try saying:</p>
                  <ul className="text-xs space-y-1.5 text-slate-300">
                    {currentContext.examples.slice(0, isExpanded ? 4 : 2).map((example, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className={cn("text-xs mt-0.5", `text-${currentContext.color}-400`)}>•</span>
                        <span>"{example}"</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs font-medium mb-1.5">I can help with:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentContext.capabilities.map((cap, i) => (
                          <span 
                            key={i}
                            className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-300"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}