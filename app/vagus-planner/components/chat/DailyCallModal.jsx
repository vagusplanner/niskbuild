import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Users, Monitor, MonitorOff, Maximize2, Minimize2, Loader2,
  Copy, Check, Hand, MessageSquare, X, Send, Grid, Sidebar,
  Settings, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

// ─── Load Daily SDK ─────────────────────────────────────────────────────────
function useDailyScript() {
  const [loaded, setLoaded] = useState(!!window.DailyIframe);
  useEffect(() => {
    if (window.DailyIframe) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.crossOrigin = 'anonymous';
    script.onload = () => setLoaded(true);
    script.onerror = () => toast.error('Failed to load call library');
    document.head.appendChild(script);
  }, []);
  return loaded;
}

// ─── Participant Tile ────────────────────────────────────────────────────────
function ParticipantTile({ participant, isLocal, isLarge, isSpeaking, handRaised }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !participant?.tracks?.video?.persistentTrack) return;
    const stream = new MediaStream([participant.tracks.video.persistentTrack]);
    videoRef.current.srcObject = stream;
  }, [participant?.tracks?.video?.persistentTrack]);

  const hasVideo = participant?.tracks?.video?.state === 'playable';
  const isMuted = participant?.tracks?.audio?.state !== 'playable';
  const name = participant?.user_name || participant?.user_id || 'Guest';

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center transition-all',
      isLarge ? 'col-span-2 row-span-2' : '',
      isSpeaking && 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950'
    )}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay playsInline
          muted={isLocal}
          className={cn('w-full h-full object-cover', isLocal && 'scale-x-[-1]')}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold shadow-lg',
            isLarge ? 'w-24 h-24 text-4xl' : 'w-14 h-14 text-2xl'
          )}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-slate-300 text-xs">{name}</span>
        </div>
      )}

      {/* Overlay badges */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-white text-xs bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[75%]">
          {isLocal ? `${name} (you)` : name}
        </span>
        <div className="flex items-center gap-1">
          {handRaised && <span className="bg-yellow-500/80 rounded-full px-1.5 py-0.5 text-xs">✋</span>}
          {isMuted && (
            <div className="bg-red-500/80 rounded-full p-1">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Screen share badge */}
      {participant?.tracks?.screenVideo?.state === 'playable' && (
        <div className="absolute top-2 left-2 bg-teal-600/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <Monitor className="w-3 h-3" /> Sharing screen
        </div>
      )}
    </div>
  );
}

// ─── Pre-call Lobby ──────────────────────────────────────────────────────────
function PreCallLobby({ chat, currentUser, initialMode, onJoin, onCancel }) {
  const videoPreviewRef = useRef(null);
  const [camEnabled, setCamEnabled] = useState(initialMode === 'video');
  const [micEnabled, setMicEnabled] = useState(true);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (!camEnabled) { stream?.getTracks().forEach(t => t.stop()); setStream(null); return; }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(s => {
      setStream(s);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = s;
    }).catch(() => {});
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [camEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="fixed inset-0 z-[200] bg-slate-950/95 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Join Call</h2>
            <p className="text-slate-400 text-sm">{chat.name} · {chat.type === 'group' ? 'Group call' : '1-on-1 call'}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Camera preview */}
        <div className="relative bg-slate-950 aspect-video mx-6 mt-5 rounded-2xl overflow-hidden flex items-center justify-center">
          {camEnabled ? (
            <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                {(currentUser?.full_name || currentUser?.email || '?').charAt(0).toUpperCase()}
              </div>
              <p className="text-slate-400 text-sm">Camera is off</p>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              onClick={() => setMicEnabled(p => !p)}
              className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-colors', micEnabled ? 'bg-slate-700 text-white' : 'bg-red-500/80 text-white')}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCamEnabled(p => !p)}
              className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-colors', camEnabled ? 'bg-slate-700 text-white' : 'bg-red-500/80 text-white')}
            >
              {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="px-6 py-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onJoin({ videoEnabled: camEnabled, audioEnabled: micEnabled })}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold shadow-lg shadow-teal-900/40 transition-all"
          >
            Join Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── In-Call Chat Panel ───────────────────────────────────────────────────────
function InCallChat({ messages, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-white text-sm font-semibold">In-call Chat</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && <p className="text-slate-500 text-xs text-center mt-4">No messages yet</p>}
        {messages.map((m, i) => (
          <div key={i} className={cn('text-xs', m.isLocal ? 'text-right' : 'text-left')}>
            <span className="text-slate-500 block mb-0.5">{m.name}</span>
            <span className={cn('inline-block px-3 py-1.5 rounded-xl text-white', m.isLocal ? 'bg-teal-600' : 'bg-slate-700')}>
              {m.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onSend(text.trim()); setText(''); } }}
          placeholder="Message…"
          className="flex-1 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 outline-none placeholder-slate-500"
        />
        <button
          onClick={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
          className="w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-500 flex items-center justify-center transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Participants Panel ───────────────────────────────────────────────────────
function ParticipantsPanel({ participants, handRaises }) {
  const list = Object.values(participants);
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-white text-sm font-semibold">Participants ({list.length})</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {list.map(p => {
          const name = p.user_name || p.user_id || 'Guest';
          const isMuted = p.tracks?.audio?.state !== 'playable';
          const hasVideo = p.tracks?.video?.state === 'playable';
          return (
            <div key={p.session_id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-slate-200 text-sm truncate">{p.local ? `${name} (you)` : name}</span>
              <div className="flex items-center gap-1">
                {handRaises[p.session_id] && <span className="text-sm">✋</span>}
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-teal-400" />}
                {!hasVideo && <VideoOff className="w-3.5 h-3.5 text-slate-500" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Call Modal ──────────────────────────────────────────────────────────
export default function DailyCallModal({ chat, currentUser, onClose, initialMode = 'video' }) {
  const dailyLoaded = useDailyScript();
  const callFrameRef = useRef(null);

  const [phase, setPhase] = useState('lobby'); // lobby | loading | joining | active | ended | error
  const [callSettings, setCallSettings] = useState({ videoEnabled: initialMode === 'video', audioEnabled: true });
  const [participants, setParticipants] = useState({});
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(initialMode === 'video');
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [handRaises, setHandRaises] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [roomUrl, setRoomUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sidePanel, setSidePanel] = useState(null); // null | 'chat' | 'participants'
  const [inCallMessages, setInCallMessages] = useState([]);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [layout, setLayout] = useState('grid'); // grid | spotlight
  const timerRef = useRef(null);

  const handleJoinFromLobby = useCallback(async (settings) => {
    setCallSettings(settings);
    setVideoEnabled(settings.videoEnabled);
    setAudioEnabled(settings.audioEnabled);
    setPhase('loading');

    if (!dailyLoaded) return;
    try {
      const { data } = await base44.functions.invoke('dailyRoom', {
        action: 'get_or_create_room',
        chat_id: chat.id
      });
      if (!data?.room_url || !data?.token) throw new Error(data?.error || 'Failed to create room');
      setRoomUrl(data.room_url);
      await joinRoom(data.room_url, data.token, settings);
    } catch (err) {
      setPhase('error');
      toast.error(`Call setup failed: ${err.message}`);
    }
  }, [dailyLoaded, chat.id]);

  const joinRoom = useCallback(async (url, token, settings) => {
    setPhase('joining');
    const frame = window.DailyIframe.createCallObject({
      audioSource: settings.audioEnabled,
      videoSource: settings.videoEnabled,
      dailyConfig: { experimentalChromeVideoMuteLightOff: true }
    });
    callFrameRef.current = frame;

    frame.on('joining-meeting', () => setPhase('joining'));
    frame.on('joined-meeting', (e) => {
      setPhase('active');
      setParticipants(e.participants || {});
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    });
    frame.on('participant-joined', () => setParticipants({ ...frame.participants() }));
    frame.on('participant-updated', () => setParticipants({ ...frame.participants() }));
    frame.on('participant-left', () => setParticipants({ ...frame.participants() }));
    frame.on('active-speaker-change', (e) => setActiveSpeaker(e?.activeSpeaker?.peerId));
    frame.on('app-message', (e) => {
      if (e.data?.type === 'hand_raise') {
        setHandRaises(prev => ({ ...prev, [e.fromId]: e.data.raised }));
      }
      if (e.data?.type === 'chat') {
        setInCallMessages(prev => [...prev, {
          text: e.data.text,
          name: e.data.name,
          isLocal: false
        }]);
      }
    });
    frame.on('left-meeting', () => {
      setPhase('ended');
      clearInterval(timerRef.current);
      setTimeout(onClose, 1200);
    });
    frame.on('error', (e) => {
      setPhase('error');
      toast.error(`Call error: ${e?.errorMsg || 'Unknown'}`);
    });

    await frame.join({ url, token, startVideoOff: !settings.videoEnabled, startAudioOff: !settings.audioEnabled });
  }, [onClose]);

  // Cleanup
  useEffect(() => () => {
    callFrameRef.current?.leave().catch(() => {});
    clearInterval(timerRef.current);
  }, []);

  const handleEndCall = useCallback(() => {
    clearInterval(timerRef.current);
    callFrameRef.current?.leave();
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!callFrameRef.current) return;
    await callFrameRef.current.setLocalAudio(!audioEnabled);
    setAudioEnabled(p => !p);
  }, [audioEnabled]);

  const toggleVideo = useCallback(async () => {
    if (!callFrameRef.current) return;
    await callFrameRef.current.setLocalVideo(!videoEnabled);
    setVideoEnabled(p => !p);
  }, [videoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!callFrameRef.current) return;
    if (screenSharing) {
      await callFrameRef.current.stopScreenShare();
      setScreenSharing(false);
    } else {
      try {
        await callFrameRef.current.startScreenShare();
        setScreenSharing(true);
      } catch (e) {
        toast.error('Screen share cancelled or not supported');
      }
    }
  }, [screenSharing]);

  const toggleHand = useCallback(async () => {
    if (!callFrameRef.current) return;
    const newRaised = !handRaised;
    setHandRaised(newRaised);
    callFrameRef.current.sendAppMessage({ type: 'hand_raise', raised: newRaised }, '*');
  }, [handRaised]);

  const sendChatMessage = useCallback((text) => {
    if (!callFrameRef.current) return;
    const name = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'You';
    callFrameRef.current.sendAppMessage({ type: 'chat', text, name }, '*');
    setInCallMessages(prev => [...prev, { text, name, isLocal: true }]);
  }, [currentUser]);

  const copyRoomLink = () => {
    if (!roomUrl) return;
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied!');
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const participantList = Object.values(participants);
  const localParticipant = participants?.local;
  const remoteParticipants = participantList.filter(p => !p.local);
  const screenSharerParticipant = participantList.find(p => p.tracks?.screenVideo?.state === 'playable');

  // Grid layout calc
  const totalTiles = participantList.length;
  const gridCols = totalTiles <= 1 ? 'grid-cols-1'
    : totalTiles === 2 ? 'grid-cols-2'
    : totalTiles <= 4 ? 'grid-cols-2'
    : 'grid-cols-3';

  // Show lobby first
  if (phase === 'lobby') {
    return (
      <PreCallLobby
        chat={chat}
        currentUser={currentUser}
        initialMode={initialMode}
        onJoin={handleJoinFromLobby}
        onCancel={onClose}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-[200] bg-slate-950 flex flex-col',
          !isFullscreen && 'lg:inset-4 lg:rounded-3xl lg:overflow-hidden shadow-2xl'
        )}
      >
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              {chat.type === 'group' ? <Users className="w-4 h-4" /> : chat.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{chat.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {phase === 'loading' && 'Setting up room…'}
                {phase === 'joining' && 'Joining…'}
                {phase === 'active' && `${formatDuration(callDuration)} · ${participantList.length} participant${participantList.length !== 1 ? 's' : ''}`}
                {phase === 'ended' && 'Call ended'}
                {phase === 'error' && 'Connection error'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout toggle */}
            {phase === 'active' && (
              <button
                onClick={() => setLayout(l => l === 'grid' ? 'spotlight' : 'grid')}
                className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                title="Toggle layout"
              >
                {layout === 'grid' ? <Sidebar className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{layout === 'grid' ? 'Spotlight' : 'Grid'}</span>
              </button>
            )}
            {/* Copy invite */}
            {roomUrl && phase === 'active' && (
              <button
                onClick={copyRoomLink}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite'}</span>
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(p => !p)}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-300" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* ── Main Body ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video area */}
          <div className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col gap-3">

            {/* Loading / error states */}
            {(phase === 'loading' || phase === 'joining') && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-teal-900/60"
                >
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </motion.div>
                <p className="text-slate-300 font-medium">{phase === 'loading' ? 'Creating your room…' : 'Joining call…'}</p>
                <p className="text-slate-500 text-xs">Up to 8 participants supported</p>
              </div>
            )}

            {phase === 'error' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center">
                  <PhoneOff className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 font-medium">Failed to connect</p>
                <p className="text-slate-500 text-sm max-w-xs">Check your connection and browser permissions, then try again.</p>
                <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition-colors">
                  Close
                </button>
              </div>
            )}

            {phase === 'active' && (
              <>
                {/* Screen share spotlight */}
                {screenSharerParticipant && (
                  <div className="flex-1 relative rounded-xl overflow-hidden bg-slate-800">
                    <ScreenShareTile participant={screenSharerParticipant} />
                    <div className="absolute bottom-2 left-2 bg-teal-600/80 text-white text-xs px-2 py-0.5 rounded-full">
                      {screenSharerParticipant.local ? 'Your screen' : `${screenSharerParticipant.user_name || 'Guest'}'s screen`}
                    </div>
                    {/* Thumbnail strip */}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {participantList.map(p => (
                        <div key={p.session_id} className="w-20 h-14 rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900">
                          <ParticipantTile participant={p} isLocal={p.local} isSpeaking={activeSpeaker === p.session_id} handRaised={handRaises[p.session_id]} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid / Spotlight layout (no screen share) */}
                {!screenSharerParticipant && layout === 'grid' && (
                  <div className={cn('flex-1 grid gap-2 sm:gap-3 auto-rows-fr', gridCols)}>
                    {localParticipant && (
                      <ParticipantTile
                        participant={localParticipant} isLocal={true}
                        isSpeaking={activeSpeaker === localParticipant.session_id}
                        handRaised={handRaised}
                      />
                    )}
                    {remoteParticipants.map(p => (
                      <ParticipantTile
                        key={p.session_id} participant={p} isLocal={false}
                        isSpeaking={activeSpeaker === p.session_id}
                        handRaised={handRaises[p.session_id]}
                      />
                    ))}
                    {participantList.length === 1 && (
                      <div className="rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-3">
                        <Users className="w-10 h-10 text-slate-600" />
                        <p className="text-slate-500 text-sm">Waiting for others…</p>
                        <button onClick={copyRoomLink} className="text-xs text-teal-400 hover:text-teal-300 underline">Copy invite link</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Spotlight layout */}
                {!screenSharerParticipant && layout === 'spotlight' && (
                  <div className="flex-1 flex gap-2">
                    {/* Main spotlight: active speaker or first remote */}
                    <div className="flex-1 rounded-xl overflow-hidden">
                      {(() => {
                        const spotlight = participantList.find(p => p.session_id === activeSpeaker)
                          || remoteParticipants[0] || localParticipant;
                        if (!spotlight) return null;
                        return <ParticipantTile participant={spotlight} isLocal={spotlight.local} isSpeaking={true} handRaised={handRaises[spotlight.session_id]} />;
                      })()}
                    </div>
                    {/* Sidebar strip */}
                    <div className="w-28 flex flex-col gap-2 overflow-y-auto">
                      {participantList.filter(p => p.session_id !== activeSpeaker).map(p => (
                        <div key={p.session_id} className="h-20 rounded-lg overflow-hidden">
                          <ParticipantTile participant={p} isLocal={p.local} handRaised={handRaises[p.session_id]} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Side panel */}
          {sidePanel && phase === 'active' && (
            <div className="w-72 flex-shrink-0 hidden sm:block">
              <div className="h-full flex flex-col">
                <button
                  onClick={() => setSidePanel(null)}
                  className="absolute top-14 right-72 mt-1 mr-1 z-10 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {sidePanel === 'chat' && <InCallChat messages={inCallMessages} onSend={sendChatMessage} />}
                {sidePanel === 'participants' && <ParticipantsPanel participants={participants} handRaises={handRaises} />}
              </div>
            </div>
          )}
        </div>

        {/* ── Controls Bar ── */}
        {(phase === 'active' || phase === 'joining') && (
          <div className="flex-shrink-0 px-4 pb-5 pt-3 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <ControlBtn onClick={toggleAudio} active={audioEnabled} icon={audioEnabled ? Mic : MicOff}
                label={audioEnabled ? 'Mute' : 'Unmute'} danger={!audioEnabled} />
              <ControlBtn onClick={toggleVideo} active={videoEnabled} icon={videoEnabled ? Video : VideoOff}
                label={videoEnabled ? 'Cam off' : 'Cam on'} danger={!videoEnabled} />
              <ControlBtn onClick={toggleScreenShare} active={!screenSharing} icon={screenSharing ? MonitorOff : Monitor}
                label={screenSharing ? 'Stop share' : 'Share'} accent={screenSharing} />
              <ControlBtn onClick={toggleHand} active={!handRaised} icon={Hand}
                label={handRaised ? 'Lower' : 'Raise'} accent={handRaised} />
              <ControlBtn
                onClick={() => setSidePanel(p => p === 'chat' ? null : 'chat')}
                active={sidePanel !== 'chat'} icon={MessageSquare}
                label="Chat"
                badge={inCallMessages.length > 0 && sidePanel !== 'chat' ? inCallMessages.length : null}
              />
              <ControlBtn
                onClick={() => setSidePanel(p => p === 'participants' ? null : 'participants')}
                active={sidePanel !== 'participants'} icon={Users}
                label={`People (${participantList.length})`}
              />
              {/* End call */}
              <button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex flex-col items-center justify-center transition-all shadow-xl shadow-red-900/50 gap-0.5 ml-2"
              >
                <PhoneOff className="w-6 h-6 text-white" />
                <span className="text-white text-[9px]">End</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Screen Share Tile ────────────────────────────────────────────────────────
function ScreenShareTile({ participant }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const track = participant?.tracks?.screenVideo?.persistentTrack;
    if (!videoRef.current || !track) return;
    videoRef.current.srcObject = new MediaStream([track]);
  }, [participant?.tracks?.screenVideo?.persistentTrack]);
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}

// ─── Control Button ───────────────────────────────────────────────────────────
function ControlBtn({ onClick, icon: Icon, label, active, danger, accent, disabled, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'relative w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all shadow-md disabled:opacity-30',
        danger ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          : accent ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400'
          : active ? 'bg-slate-700 hover:bg-slate-600 text-white'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[9px] leading-none truncate max-w-[44px] text-center">{label?.split('(')[0].trim()}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}