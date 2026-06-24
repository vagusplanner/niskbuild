import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VoiceMessageRecorder({ onSendVoice, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      toast.error('Microphone access denied');
      onCancel?.();
      return null;
    });
    if (!stream) return;

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      setUploading(true);
      try {
        const { file_url } = await SDK.integrations.Core.UploadFile({ file });
        onSendVoice({ url: file_url, duration: seconds });
      } catch {
        toast.error('Failed to send voice message');
      }
      setUploading(false);
    };

    mr.start();
    setRecording(true);
    startTimer();
  };

  const stopAndSend = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const cancel = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    onCancel?.();
  };

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-3xl px-4 py-2.5"
    >
      {/* Pulsing mic */}
      <motion.div
        animate={recording ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
        className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"
      >
        <Mic className="w-4 h-4 text-white" />
      </motion.div>

      {/* Timer */}
      <span className="text-red-600 dark:text-red-400 font-mono text-sm font-semibold flex-1">
        {uploading ? 'Sending…' : fmt(seconds)}
      </span>

      {/* Waveform visual */}
      {recording && !uploading && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-red-400 rounded-full"
              animate={{ height: ['6px', `${8 + Math.random() * 14}px`, '6px'] }}
              transition={{ repeat: Infinity, duration: 0.5 + i * 0.1, delay: i * 0.05 }}
            />
          ))}
        </div>
      )}

      {uploading && <Loader2 className="w-4 h-4 text-red-500 animate-spin flex-shrink-0" />}

      {/* Cancel */}
      {!uploading && (
        <button onClick={cancel} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 hover:bg-slate-300 transition-colors">
          <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      )}

      {/* Stop & send */}
      {recording && !uploading && (
        <button onClick={stopAndSend} className="w-8 h-8 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center flex-shrink-0 transition-colors">
          <Send className="w-4 h-4 text-white" />
        </button>
      )}
    </motion.div>
  );
}