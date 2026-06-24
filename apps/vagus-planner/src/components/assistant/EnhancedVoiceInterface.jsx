import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FloatingButton, useFloatingManager } from '@/components/ui/floating-manager';

export default function EnhancedVoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const { openFloating, closeFloating } = useFloatingManager();

  useEffect(() => {
    // Check if browser supports speech recognition
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

        // If final result, process it
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
      const response = await base44.functions.invoke('voiceCommandProcessor', {
        command
      });

      setResult(response.data);
      setShowResult(true);
      
      // Speak the response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.data.response);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }

      toast.success('Command executed successfully!');
      
      // Auto-hide after 5 seconds
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
            "w-14 h-14 rounded-full shadow-2xl transition-all relative",
            isListening
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          )}
        >
          {processing ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : isListening ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
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
            className="fixed bottom-24 right-6 z-[102] lg:bottom-24 max-w-[calc(100vw-3rem)]"
          >
            <Card className="p-4 max-w-sm shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-teal-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Mic className="w-4 h-4 text-teal-600" />
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
            className="fixed bottom-24 right-6 z-[102] lg:bottom-24 max-w-[calc(100vw-3rem)]"
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
                        {JSON.stringify(result.action_result, null, 2)}
                      </p>
                    </div>
                  )}
                  
                  {result.confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Commands Hint - Only on hover */}
      <AnimatePresence>
        {showHints && !isListening && !transcript && !showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-24 z-[99] lg:bottom-6 lg:right-24 max-w-[280px]"
          >
            <Card className="p-3 shadow-2xl bg-slate-800 text-white border-slate-700">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium mb-1.5">Try saying:</p>
                  <ul className="text-xs space-y-1 text-slate-300">
                    <li>"Schedule lunch tomorrow at 1pm"</li>
                    <li>"What's my schedule today?"</li>
                    <li>"Add task to buy groceries"</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}