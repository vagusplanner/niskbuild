import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function VoiceCommandCapture() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcript) {
          processCommand(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable in browser settings.');
        } else {
          toast.error('Voice recognition error. Please try again.');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [transcript]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    setTranscript('');
    setResult(null);
    setShowPanel(true);
    setIsListening(true);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processCommand = async (command) => {
    setProcessing(true);
    try {
      const { data } = await SDK.functions.invoke('parseVoiceCommand', {
        command: command
      });

      if (data.success) {
        setResult(data);
        
        if (data.created) {
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          toast.success(`${data.created.type === 'event' ? 'Event' : 'Task'} created successfully!`);
        } else if (data.parsed.confidence > 50) {
          toast.info('Command parsed. Review and confirm?');
        } else {
          toast.error('Could not understand command. Please try again.');
        }
      }
    } catch (error) {
      toast.error('Failed to process command');
      setResult({ error: true });
    } finally {
      setProcessing(false);
    }
  };

  const manualCreateFromParsed = async () => {
    if (!result?.parsed) return;

    try {
      const parsed = result.parsed;
      
      if (parsed.type === 'event') {
        const eventData = {
          title: parsed.title,
          description: parsed.description,
          start_date: parsed.date ? `${parsed.date}T${parsed.start_time || '09:00'}:00` : new Date().toISOString(),
          end_date: parsed.date && parsed.end_time 
            ? `${parsed.date}T${parsed.end_time}:00`
            : new Date(Date.now() + 3600000).toISOString(),
          category: parsed.category || 'personal',
          location: parsed.location
        };
        
        await SDK.entities.Event.create(eventData);
        queryClient.invalidateQueries({ queryKey: ['events'] });
        toast.success('Event created!');
      } else if (parsed.type === 'task') {
        const taskData = {
          title: parsed.title,
          description: parsed.description,
          due_date: parsed.date || new Date().toISOString().split('T')[0],
          category: parsed.category || 'personal',
          priority: parsed.priority || 'medium',
          status: 'todo'
        };
        
        await SDK.entities.Task.create(taskData);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success('Task created!');
      }
      
      setShowPanel(false);
      setTranscript('');
      setResult(null);
    } catch (error) {
      toast.error('Failed to create');
    }
  };

  return (
    <>
      {/* Floating Voice Button */}
      <motion.div
        className="fixed bottom-24 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={processing}
          className={`w-16 h-16 rounded-full shadow-2xl ${
            isListening 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
          }`}
        >
          {processing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
      </motion.div>

      {/* Voice Command Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => !processing && setShowPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl"
            >
              <Card className="p-6 space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Voice Command
                  </h3>
                  <button
                    onClick={() => setShowPanel(false)}
                    disabled={processing || isListening}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                {/* Status */}
                <div className="text-center">
                  {isListening ? (
                    <div className="space-y-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-20 h-20 mx-auto bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <Mic className="w-10 h-10 text-white" />
                      </motion.div>
                      <p className="text-sm font-medium text-slate-700">Listening...</p>
                      <p className="text-xs text-slate-500">Speak your command naturally</p>
                    </div>
                  ) : processing ? (
                    <div className="space-y-2">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin text-purple-600" />
                      <p className="text-sm font-medium text-slate-700">Processing with AI...</p>
                    </div>
                  ) : result ? (
                    <div className="space-y-2">
                      {result.created ? (
                        <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
                      ) : (
                        <AlertCircle className="w-12 h-12 mx-auto text-amber-600" />
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Transcript */}
                {transcript && (
                  <div className="p-4 bg-white rounded-lg border border-purple-200">
                    <p className="text-sm text-slate-600 mb-1 font-medium">You said:</p>
                    <p className="text-slate-800">{transcript}</p>
                  </div>
                )}

                {/* Parsed Result */}
                {result?.parsed && (
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-lg border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">Parsed Command</p>
                        <span className="text-xs text-slate-500">
                          {result.parsed.confidence}% confident
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Type:</span> {result.parsed.type}</p>
                        <p><span className="font-medium">Title:</span> {result.parsed.title}</p>
                        {result.parsed.date && (
                          <p><span className="font-medium">Date:</span> {result.parsed.date}</p>
                        )}
                        {result.parsed.start_time && (
                          <p><span className="font-medium">Time:</span> {result.parsed.start_time}</p>
                        )}
                        {result.parsed.category && (
                          <p><span className="font-medium">Category:</span> {result.parsed.category}</p>
                        )}
                        {result.parsed.priority && (
                          <p><span className="font-medium">Priority:</span> {result.parsed.priority}</p>
                        )}
                      </div>
                    </div>

                    {!result.created && (
                      <div className="flex gap-2">
                        <Button
                          onClick={manualCreateFromParsed}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                        >
                          Create {result.parsed.type}
                        </Button>
                        <Button
                          onClick={startListening}
                          variant="outline"
                          className="flex-1"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Example Commands */}
                {!transcript && !result && !isListening && (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-medium text-slate-700">Try saying:</p>
                    <p className="text-slate-500">• "Schedule team meeting tomorrow after Asr prayer for 30 minutes"</p>
                    <p className="text-slate-500">• "Add task to call client today urgent priority"</p>
                    <p className="text-slate-500">• "Create reminder to read Quran before Fajr daily"</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}