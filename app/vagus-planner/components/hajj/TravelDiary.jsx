/**
 * TravelDiary — Voice-to-text spiritual travel diary
 * Records voice reflections, transcribes via AI, tags key moments/locations,
 * saves to JournalEntry, with option to share to a connected travel group.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Mic, MicOff, Loader2, BookOpen, Share2, MapPin, Tag,
  Heart, Sparkles, Check, X, Play, Pause, ChevronDown, ChevronUp,
  Trash2, Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LOCATIONS = [
  'Masjid al-Haram', 'Kaaba', 'Cave Hira (Jabal al-Nour)', 'Jabal Thawr',
  'Mina', 'Arafat', 'Muzdalifah', 'Zamzam', 'Safa & Marwah',
  "Masjid al-Nabawi", "Jannat al-Baqi'", 'Masjid Quba', 'Jabal Uhud',
  'Masjid al-Qiblatayn', 'Miqat', 'Other'
];

const MOMENT_TAGS = [
  '🕌 Prayer', '🤲 Du\'a', '😢 Emotional', '✨ Spiritual Breakthrough',
  '🏃 Physical Challenge', '👥 Group Moment', '📸 Memorable View',
  '🌅 Sunrise/Sunset', '💧 Zamzam', '🌙 Night Reflection', '🏆 Milestone',
];

function AudioWave({ isRecording }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-rose-500"
          animate={isRecording ? {
            height: [4, Math.random() * 24 + 4, 4],
          } : { height: 4 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function TravelDiary({ groupChatId }) {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [shareEntry, setShareEntry] = useState(null);
  const recognitionRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: entries = [] } = useQuery({
    queryKey: ['travelDiary'],
    queryFn: () => base44.entities.JournalEntry.filter(
      { input_method: 'voice' },
      '-created_date', 20
    ),
  });

  // Start/stop recording
  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser. Try Chrome.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = '';
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + ' ';
        else interim = t;
      }
      setTranscript(finalTranscript + interim);
    };
    recognition.onerror = (e) => {
      toast.error('Recording error: ' + e.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript('');
    setAiResult(null);
  };

  // AI process transcript
  const processTranscript = async () => {
    if (!transcript.trim()) { toast.error('No transcript to process.'); return; }
    setProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic travel diary assistant. Analyze this voice recording from a pilgrim on Hajj/Umrah or Ziyarat:

"${transcript}"

Extract and structure:
1. A short meaningful title (max 8 words)
2. A brief AI summary (2-3 sentences capturing the spiritual essence)
3. Key locations mentioned (from: Masjid al-Haram, Kaaba, Cave Hira, Mina, Arafat, Muzdalifah, Masjid al-Nabawi, Baqi, Masjid Quba, Jabal Uhud, etc.)
4. Emotional tone (joyful/emotional/reflective/grateful/challenging/peaceful)
5. Mood score 1-10 (10 = peak spiritual high)
6. Key spiritual moments or insights detected (max 3)
7. Relevant tags from: Prayer, Du'a, Emotional, Spiritual Breakthrough, Physical Challenge, Group Moment, Memorable View, Sunrise/Sunset, Zamzam, Night Reflection, Milestone
8. A relevant Quranic verse or Hadith that matches the reflection (with reference)`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            locations: { type: 'array', items: { type: 'string' } },
            emotion: { type: 'string' },
            mood_score: { type: 'number' },
            spiritual_moments: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            quran_or_hadith: { type: 'string' },
            quran_reference: { type: 'string' },
          }
        }
      });
      setAiResult(result);
      if (result.locations?.length > 0 && !selectedLocation) setSelectedLocation(result.locations[0]);
      if (result.tags?.length > 0) setSelectedTags(result.tags.slice(0, 4));
    } catch (e) {
      toast.error('AI processing failed. You can still save manually.');
    }
    setProcessing(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.JournalEntry.create({
        title: aiResult?.title || `Travel Diary — ${selectedLocation || 'Pilgrimage'}`,
        transcript,
        ai_summary: aiResult?.summary || transcript.substring(0, 200),
        mood_score: aiResult?.mood_score || 7,
        entry_date: today,
        input_method: 'voice',
        emotional_insights: aiResult?.spiritual_moments?.map(m => ({ emotion: 'reflection', insight: m })) || [],
        spiritual_reminders: aiResult?.quran_or_hadith ? [{ reminder: `${aiResult.quran_or_hadith} (${aiResult.quran_reference || ''})`, type: 'verse' }] : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travelDiary'] });
      toast.success('Diary entry saved to your Journal!');
      setTranscript('');
      setAiResult(null);
      setSelectedTags([]);
      setSelectedLocation('');
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (entry) => {
      if (!groupChatId) { toast.error('No travel group linked.'); return; }
      const snippet = entry.ai_summary || entry.transcript?.substring(0, 200);
      return base44.entities.GroupMessage.create({
        group_chat_id: groupChatId,
        sender_email: user?.email,
        sender_name: user?.full_name,
        content: `✈️ *Travel Diary — ${entry.title}*\n\n${snippet}\n\n📍 ${selectedLocation || 'On the journey'} · 🤲 From my pilgrimage diary`,
        message_type: 'text',
      });
    },
    onSuccess: () => toast.success('Shared with your travel group!'),
    onError: () => toast.error('Could not share — check group connection.'),
  });

  const emotionColor = {
    joyful: 'bg-yellow-100 text-yellow-800',
    emotional: 'bg-rose-100 text-rose-800',
    reflective: 'bg-indigo-100 text-indigo-800',
    grateful: 'bg-emerald-100 text-emerald-800',
    challenging: 'bg-orange-100 text-orange-800',
    peaceful: 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-md">
        <div className="p-2.5 bg-white/20 rounded-xl">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-white">Travel Diary</h3>
          <p className="text-xs text-rose-100">Voice-record your spiritual reflections</p>
        </div>
      </div>

      {/* Recording Panel */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        {/* Record Button */}
        <div className="flex flex-col items-center gap-3">
          <button onClick={toggleRecording}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
              isRecording
                ? "bg-rose-500 scale-105 shadow-rose-300 dark:shadow-rose-900"
                : "bg-gradient-to-br from-rose-400 to-pink-600 hover:scale-105"
            )}>
            {isRecording
              ? <MicOff className="w-8 h-8 text-white" />
              : <Mic className="w-8 h-8 text-white" />
            }
          </button>
          {isRecording && <AudioWave isRecording={isRecording} />}
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {isRecording ? 'Recording... tap to stop' : 'Tap to record your reflection'}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[80px]">
            <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Transcript</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Location */}
        {transcript && (
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
            <div className="flex flex-wrap gap-1.5">
              {LOCATIONS.map(loc => (
                <button key={loc} onClick={() => setSelectedLocation(loc)}
                  className={cn("text-xs px-2.5 py-1.5 rounded-full border transition-all",
                    selectedLocation === loc
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-rose-300"
                  )}>
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {transcript && (
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Moments</p>
            <div className="flex flex-wrap gap-1.5">
              {MOMENT_TAGS.map(tag => (
                <button key={tag} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={cn("text-xs px-2 py-1 rounded-full border transition-all",
                    selectedTags.includes(tag)
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-pink-300"
                  )}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Processing */}
        {transcript && !aiResult && (
          <Button onClick={processTranscript} disabled={processing}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyse with AI</>}
          </Button>
        )}

        {/* AI Result Preview */}
        {aiResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 rounded-xl border border-violet-200 dark:border-violet-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-violet-800 dark:text-violet-200 text-sm">{aiResult.title}</h4>
              <Badge className={cn("text-xs flex-shrink-0", emotionColor[aiResult.emotion] || 'bg-slate-100 text-slate-700')}>{aiResult.emotion}</Badge>
            </div>
            <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">{aiResult.summary}</p>
            {aiResult.quran_or_hadith && (
              <div className="p-2.5 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-violet-200 dark:border-violet-700">
                <p className="text-xs text-violet-700 dark:text-violet-300 italic">"{aiResult.quran_or_hadith}"</p>
                <p className="text-[10px] text-violet-500 mt-0.5">{aiResult.quran_reference}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-600 font-semibold">Mood: {aiResult.mood_score}/10</span>
              <div className="flex-1 h-1.5 bg-violet-100 dark:bg-violet-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full" style={{ width: `${aiResult.mood_score * 10}%` }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Save & Share Actions */}
        {transcript && (
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BookOpen className="w-4 h-4 mr-2" />Save to Journal</>}
            </Button>
            {groupChatId && (
              <Button variant="outline" onClick={() => shareMutation.mutate({ title: aiResult?.title || 'Diary', ai_summary: aiResult?.summary, transcript })}
                disabled={shareMutation.isPending} className="border-rose-200 text-rose-600">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Past Entries */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Entries</p>
          {entries.slice(0, 5).map(entry => (
            <div key={entry.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <BookOpen className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{entry.title || 'Travel Diary'}</p>
                    <p className="text-xs text-slate-400">{entry.created_date ? formatDistanceToNow(new Date(entry.created_date), { addSuffix: true }) : ''}</p>
                  </div>
                </div>
                {entry.mood_score && <span className="text-xs font-bold text-rose-500 mr-2">{entry.mood_score}/10</span>}
                {expandedEntry === entry.id ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              <AnimatePresence>
                {expandedEntry === entry.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {entry.ai_summary && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{entry.ai_summary}</p>}
                      {entry.transcript && <p className="text-xs text-slate-500 italic line-clamp-3">"{entry.transcript}"</p>}
                      {groupChatId && (
                        <Button size="sm" variant="outline"
                          onClick={() => shareMutation.mutate(entry)}
                          className="text-xs border-rose-200 text-rose-600 h-8">
                          <Send className="w-3 h-3 mr-1" />Share with Group
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}