import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function CalendarVoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript_chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(prev => prev + transcript_chunk);
        } else {
          interimTranscript += transcript_chunk;
        }
      }
      if (interimTranscript) setTranscript(interimTranscript);
    };

    recognition.onerror = () => {
      toast.error('Failed to listen');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processVoiceCommand = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this calendar scheduling request and extract: title, duration (default 30), date, time. If relative (like "next Tuesday"), calculate actual date from today (${new Date().toDateString()}). Return JSON only.
      
Request: "${text}"

Respond ONLY with valid JSON like: {"title":"Meeting title","duration":30,"date":"2026-02-15","time":"14:30"}`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            duration: { type: 'number' },
            date: { type: 'string' },
            time: { type: 'string' }
          }
        }
      });

      const { title, duration, date, time } = response;

      const [hours, minutes] = time.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + duration);

      await base44.entities.Event.create({
        title,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        category: 'work'
      });

      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`✓ Created: ${title}`);
      setTranscript('');
    } catch (err) {
      toast.error('Failed to create event');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  // Auto-process when transcript is finalized
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      processVoiceCommand(transcript);
    }
  }, [isListening, transcript]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-gradient-to-br from-teal-50 dark:from-teal-950 to-cyan-50 dark:to-cyan-950 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Voice Scheduler
          </CardTitle>
          <CardDescription>"Schedule lunch with Ahmed next Tuesday" - speak naturally</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={toggleListening}
            disabled={isProcessing}
            className={`w-full h-16 text-lg font-semibold transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Listening... (tap to stop)
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Tap to Speak
              </>
            )}
          </Button>

          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-teal-200 dark:border-teal-700"
              >
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">You said:</p>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                  "{transcript}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg text-xs text-teal-900 dark:text-teal-100 space-y-1">
            <p className="font-semibold">Examples:</p>
            <ul className="space-y-1">
              <li>• "Schedule team sync on Friday at 2 PM"</li>
              <li>• "Coffee with Sarah next Wednesday morning"</li>
              <li>• "Book dentist appointment for one hour tomorrow"</li>
              <li>• "Create meeting with product team next Tuesday at 10"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}