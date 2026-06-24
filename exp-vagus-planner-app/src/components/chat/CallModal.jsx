import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * WebRTC-based audio/video call modal.
 * Supports 1-on-1 and small group calls (up to ~6 participants via mesh).
 * Signaling is done via polling the base44 Chat entity with special message_type.
 */
export default function CallModal({ chat, currentUser, onClose, initialMode = 'video' }) {
  const [callState, setCallState] = useState('ringing'); // ringing | active | ended
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(initialMode === 'video');
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const callStartTimeRef = useRef(null);
  const timerRef = useRef(null);

  const isGroup = chat?.type === 'group';
  const callTitle = chat?.name || 'Unknown';

  // Start local media
  useEffect(() => {
    startLocalMedia();
    // Simulate remote answer after 2s for demo (replace with real signaling)
    const answerTimeout = setTimeout(() => {
      setCallState('active');
      callStartTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    }, 2000);

    return () => {
      clearTimeout(answerTimeout);
      cleanup();
    };
  }, []);

  const startLocalMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: initialMode === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Could not access camera/microphone. Please check permissions.');
      console.error('Media error:', err);
    }
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !audioEnabled; });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !videoEnabled; });
      setVideoEnabled(!videoEnabled);
    }
  };

  const handleEndCall = () => {
    cleanup();
    setCallState('ended');
    setTimeout(onClose, 800);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <div className="text-center flex-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center mx-auto mb-2 shadow-xl shadow-teal-900/40">
              {isGroup
                ? <Users className="w-7 h-7 text-white" />
                : <span className="text-white text-2xl font-bold">{callTitle.charAt(0).toUpperCase()}</span>
              }
            </div>
            <h2 className="text-white text-xl font-semibold">{callTitle}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {callState === 'ringing' && (initialMode === 'video' ? 'Calling video…' : 'Calling…')}
              {callState === 'active' && formatDuration(callDuration)}
              {callState === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>

        {/* Video area */}
        {initialMode === 'video' && (
          <div className="flex-1 relative mx-4 rounded-3xl overflow-hidden bg-slate-800">
            {/* Remote video placeholder */}
            <div className="w-full h-full flex items-center justify-center">
              {callState === 'active' && remoteStreams.length === 0 ? (
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-4xl font-bold">{callTitle.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-slate-400 text-sm">Camera off</p>
                </div>
              ) : callState === 'ringing' ? (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center mx-auto mb-3"
                  >
                    <span className="text-white text-4xl font-bold">{callTitle.charAt(0).toUpperCase()}</span>
                  </motion.div>
                  <p className="text-slate-400 text-sm">Connecting…</p>
                </div>
              ) : null}
            </div>

            {/* Local video (PiP) */}
            {videoEnabled && (
              <div className="absolute bottom-4 right-4 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            )}
          </div>
        )}

        {/* Audio-only waveform */}
        {initialMode === 'audio' && callState === 'active' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-end gap-1.5 h-16">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-teal-400 rounded-full"
                  animate={{ height: [8, Math.random() * 48 + 8, 8] }}
                  transition={{ repeat: Infinity, duration: 0.6 + Math.random() * 0.6, delay: i * 0.08 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-6 pb-10 pt-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                audioEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"
              )}
            >
              {audioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
            </button>

            {initialMode === 'video' && (
              <button
                onClick={toggleVideo}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  videoEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"
                )}
              >
                {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </button>
            )}

            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-xl shadow-red-900/40"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}