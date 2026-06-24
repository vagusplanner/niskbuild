import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FloatingButton } from '@/components/ui/floating-manager';

export default function UnifiedAIAssistant() {
  const location = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event) => {
      const t = event.results[event.results.length - 1][0].transcript;
      setTranscript(t);
      if (event.results[event.results.length - 1].isFinal) {
        setTimeout(() => processCommand(t), 400);
      }
    };
    recognitionRef.current.onerror = () => { setIsListening(false); toast.error('Voice recognition error'); };
    recognitionRef.current.onend = () => setIsListening(false);
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) { toast.error('Voice not supported on this browser'); return; }
    setTranscript(''); setResult(null); setShowResult(false); setIsListening(true);
    recognitionRef.current.start();
    toast.info('🎤 Listening...');
  };

  const stopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
  };

  const processCommand = async (command) => {
    setProcessing(true);
    try {
      const response = await SDK.functions.invoke('voiceCommandProcessor', {
        command,
        context: { current_page: location.pathname }
      });
      setResult(response.data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTimeout(() => setShowResult(false), 6000);
    } catch {
      toast.error('Failed to process command');
    } finally {
      setProcessing(false);
      setTranscript('');
    }
  };

  return (
    <>
      <FloatingButton id="unified-ai" position="bottom-right" stackOrder={1}>
        <Button
          size="lg"
          onClick={isListening ? stopListening : startListening}
          disabled={processing}
          title="Voice Assistant"
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl transition-all relative",
            isListening ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gradient-to-br from-cyan-500 to-teal-600"
          )}
        >
          {processing ? <Loader2 className="w-6 h-6 text-white animate-spin" />
            : isListening ? <MicOff className="w-6 h-6 text-white" />
            : <Mic className="w-6 h-6 text-white" />}
          {isListening && <span className="absolute -inset-2 rounded-full bg-red-400 animate-ping opacity-75" />}
        </Button>
      </FloatingButton>

      {/* Live transcript */}
      <AnimatePresence>
        {(isListening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-36 right-4 z-[102] max-w-xs"
          >
            <Card className="p-3 shadow-xl bg-white/95 backdrop-blur-lg border-teal-200">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-600 animate-pulse flex-shrink-0" />
                <p className="text-sm text-slate-700">{transcript || 'Speak your command...'}</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-36 right-4 z-[102] max-w-sm"
          >
            <Card className={cn("p-4 shadow-xl border-2", result.error ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
              <div className="flex items-start gap-3">
                <Sparkles className={cn("w-4 h-4 mt-0.5 flex-shrink-0", result.error ? "text-red-500" : "text-green-600")} />
                <p className="text-sm flex-1">{result.response}</p>
                <button onClick={() => setShowResult(false)} className="p-0.5 hover:bg-slate-100 rounded flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}