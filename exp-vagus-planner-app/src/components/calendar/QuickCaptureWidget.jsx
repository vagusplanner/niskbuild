import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Type, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function QuickCaptureWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'voice' or 'type'
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcriptText = event.results[event.results.length - 1][0].transcript;
        setInput(transcriptText);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition error');
      };
    }
  }, []);

  const startVoice = () => {
    if (recognitionRef.current) {
      setInput('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoice = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processInput = async () => {
    if (!input.trim()) return;

    setProcessing(true);
    try {
      const { data } = await SDK.functions.invoke('parseVoiceCommand', {
        command: input
      });

      if (data.success && data.created) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success(`${data.created.type === 'event' ? 'Event' : 'Task'} created!`);
        setIsOpen(false);
        setInput('');
        setMode(null);
      } else {
        toast.error('Could not understand. Try rephrasing.');
      }
    } catch (error) {
      toast.error('Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processInput();
  };

  return (
    <>
      {/* Floating Quick Capture Button */}
      <motion.div
        className="fixed bottom-24 lg:bottom-8 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
        >
          {isOpen ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
        </Button>
      </motion.div>

      {/* Quick Capture Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-28 right-6 z-50 w-80"
            >
              <Card className="p-4 space-y-4 bg-gradient-to-br from-white to-teal-50 border-teal-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-slate-800">Quick Capture</h3>
                </div>

                {!mode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setMode('voice');
                        startVoice();
                      }}
                      className="h-24 flex-col gap-2 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Mic className="w-8 h-8" />
                      <span>Voice</span>
                    </Button>
                    <Button
                      onClick={() => setMode('type')}
                      className="h-24 flex-col gap-2 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      <Type className="w-8 h-8" />
                      <span>Type</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mode === 'voice' ? (
                      <div className="text-center space-y-3">
                        {isListening ? (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="w-16 h-16 mx-auto bg-red-600 rounded-full flex items-center justify-center"
                            >
                              <Mic className="w-8 h-8 text-white" />
                            </motion.div>
                            <p className="text-sm text-slate-600">Listening...</p>
                            <Button onClick={stopVoice} variant="outline" size="sm">
                              Stop
                            </Button>
                          </>
                        ) : (
                          <Button onClick={startVoice} className="w-full">
                            <Mic className="w-4 h-4 mr-2" />
                            Start Speaking
                          </Button>
                        )}
                        {input && (
                          <div className="p-3 bg-white rounded-lg border text-sm text-slate-700">
                            {input}
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="E.g., Meeting tomorrow 3pm for 1 hour"
                          className="text-sm"
                          autoFocus
                        />
                        <div className="text-xs text-slate-500 space-y-1">
                          <p>• "Team meeting tomorrow after Asr"</p>
                          <p>• "Call mom tonight at 8pm"</p>
                          <p>• "Task: Review proposal urgent"</p>
                        </div>
                      </form>
                    )}

                    {input && (
                      <div className="flex gap-2">
                        <Button
                          onClick={processInput}
                          disabled={processing}
                          className="flex-1 bg-teal-600 hover:bg-teal-700"
                        >
                          {processing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Create'
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setMode(null);
                            setInput('');
                            stopVoice();
                          }}
                          variant="outline"
                        >
                          Back
                        </Button>
                      </div>
                    )}
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