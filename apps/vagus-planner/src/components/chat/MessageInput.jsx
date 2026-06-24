import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Reply, Mic, BarChart2, Calendar, Phone, ChevronDown, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
// AIDraftAssistant integrated inline into extras toolbar
import VoiceMessageRecorder from './VoiceMessageRecorder';
import CreatePollModal from './CreatePollModal';
import AttachEventModal from './AttachEventModal';
import ScheduleCallModal from './ScheduleCallModal';
import { cn } from '@/lib/utils';

export default function MessageInput({ onSendMessage, disabled, conversationId, groupChatId, replyTo, onCancelReply, chat, currentUser, onTyping }) {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [aiDrafts, setAiDrafts] = useState(null);
  const [aiDraftsLoading, setAiDraftsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const generateDrafts = async () => {
    setAiDraftsLoading(true);
    try {
      const { data } = await base44.functions.invoke('draftMessageResponse', {
        conversation_id: conversationId,
        group_chat_id: groupChatId,
        tone: 'professional',
        length: 'medium'
      });
      setAiDrafts(data);
    } catch {
      toast.error('Failed to generate AI drafts');
    } finally {
      setAiDraftsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!messageText.trim() && attachments.length === 0) return;

    let finalMessage = messageText.trim();
    const extractedInfos = attachments.filter(a => a.extractedInfo).map(a => a.extractedInfo);
    if (extractedInfos.length > 0) {
      let extractedText = '\n\n📄 Extracted from document(s):\n';
      extractedInfos.forEach((info) => {
        if (info.summary) extractedText += `\n📝 Summary: ${info.summary}`;
        if (info.scheduling_info?.length > 0) extractedText += `\n📅 Scheduling: ${info.scheduling_info.join(', ')}`;
        if (info.action_items?.length > 0) extractedText += `\n✅ Action Items: ${info.action_items.join(', ')}`;
      });
      finalMessage += extractedText;
    }

    onSendMessage({
      message: finalMessage,
      attachments: attachments.map(a => ({ url: a.url, name: a.name, type: a.type, size: a.size })),
      reply_to: replyTo?.id || null
    });
    onCancelReply?.();
    setMessageText('');
    setAttachments([]);
    setShowExtras(false);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        let extractedInfo = null;
        if (file.type.includes('pdf') || file.type.includes('image') || file.type.includes('text')) {
          try {
            extractedInfo = await base44.integrations.Core.InvokeLLM({
              prompt: `Analyze this file and extract: 1. Dates/times 2. Action items 3. Summary 4. Contact info. Be concise.`,
              file_urls: file_url,
              response_json_schema: {
                type: 'object',
                properties: {
                  scheduling_info: { type: 'array', items: { type: 'string' } },
                  action_items: { type: 'array', items: { type: 'string' } },
                  summary: { type: 'string' },
                  contacts: { type: 'array', items: { type: 'string' } }
                }
              }
            });
          } catch (_) {}
        }
        uploadedFiles.push({ url: file_url, name: file.name, type: file.type, size: file.size, extractedInfo });
      }
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${files.length} file(s) attached`);
    } catch {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendVoice = ({ url, duration }) => {
    onSendMessage({
      message: '🎙️ Voice message',
      metadata: { voice: { url, duration } },
      reply_to: replyTo?.id || null
    });
    setShowVoice(false);
    onCancelReply?.();
  };

  const handlePollCreate = (poll) => {
    onSendMessage({
      message: `📊 Poll: ${poll.question}`,
      metadata: { poll },
      reply_to: replyTo?.id || null
    });
  };

  const handleAttachEvent = (event) => {
    onSendMessage({
      message: `📅 ${event.title}`,
      metadata: { event: { id: event.id, title: event.title, start_date: event.start_date, end_date: event.end_date, location: event.location, category: event.category }, rsvps: {} },
      reply_to: replyTo?.id || null
    });
  };

  const removeAttachment = (index) => setAttachments(attachments.filter((_, i) => i !== index));

  if (showVoice) {
    return <VoiceMessageRecorder onSendVoice={handleSendVoice} onCancel={() => setShowVoice(false)} />;
  }

  return (
    <div className="space-y-2">
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 bg-teal-50 dark:bg-teal-950/30 border-l-2 border-teal-400 rounded-r-xl px-3 py-2"
          >
            <Reply className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-teal-700">
                {replyTo.sender_name || replyTo.sender_email?.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 truncate">{replyTo.message}</p>
            </div>
            <button onClick={onCancelReply} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Draft moved into extras toolbar - removed from always-visible position */}

      {/* Extras toolbar */}
      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap pb-1"
          >
            <button
              onClick={() => { generateDrafts(); setShowExtras(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Draft
            </button>
            <button
              onClick={() => { setShowPollModal(true); setShowExtras(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-100 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" /> Poll
            </button>
            <button
              onClick={() => { setShowEventModal(true); setShowExtras(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-100 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" /> Attach Event
            </button>
            <button
              onClick={() => { setShowCallModal(true); setShowExtras(false); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Schedule Call
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 text-sm">
                <Paperclip className="w-3 h-3 text-slate-600" />
                <span className="text-slate-700 truncate max-w-[120px] text-xs">{file.name}</span>
                <button onClick={() => removeAttachment(index)} className="text-slate-400 hover:text-red-600 text-lg leading-none">×</button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Drafts panel */}
      <AnimatePresence>
        {aiDrafts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border border-purple-200 rounded-xl bg-purple-50 dark:bg-purple-950/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">AI Suggestions</p>
              <button onClick={() => setAiDrafts(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {aiDraftsLoading ? (
              <div className="text-xs text-purple-500 flex items-center gap-1.5"><Sparkles className="w-3 h-3 animate-pulse" /> Generating...</div>
            ) : aiDrafts.responses?.map((draft, i) => (
              <button
                key={i}
                onClick={() => { setMessageText(draft.message); setAiDrafts(null); }}
                className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-sm text-slate-700 dark:text-slate-200 hover:border-purple-400 transition-colors"
              >
                <span className="text-[10px] font-semibold text-purple-500 block mb-0.5">{draft.approach}</span>
                {draft.message}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />

        {/* Extras toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowExtras(p => !p)}
          className={cn('h-10 w-10 rounded-full flex-shrink-0 mb-0.5', showExtras ? 'bg-teal-100 text-teal-700' : 'text-slate-500 hover:bg-slate-200')}
        >
          <ChevronDown className={cn('w-5 h-5 transition-transform', showExtras && 'rotate-180')} />
        </Button>

        {/* Attachment */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-10 w-10 rounded-full flex-shrink-0 text-slate-500 hover:bg-slate-200 mb-0.5"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <div className="flex-1 relative">
          <Input
            value={messageText}
            onChange={(e) => { setMessageText(e.target.value); onTyping?.(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type a message"
            disabled={disabled || uploading}
            className="min-h-[44px] rounded-3xl border-slate-300 bg-white px-4 py-3 resize-none"
            style={{ paddingTop: '11px', paddingBottom: '11px' }}
          />
        </div>

        {/* Voice button (shows when no text) */}
        {!messageText.trim() && attachments.length === 0 ? (
          <Button
            type="button"
            onClick={() => setShowVoice(true)}
            className="rounded-full w-12 h-12 p-0 bg-slate-600 hover:bg-slate-700 flex-shrink-0 shadow-lg mb-0.5"
          >
            <Mic className="w-5 h-5 text-white" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={(!messageText.trim() && attachments.length === 0) || disabled || uploading}
            className="rounded-full w-12 h-12 p-0 bg-[#25d366] hover:bg-[#20bd5a] flex-shrink-0 shadow-lg mb-0.5"
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        )}
      </form>

      {/* Modals */}
      <CreatePollModal open={showPollModal} onOpenChange={setShowPollModal} onCreatePoll={handlePollCreate} />
      <AttachEventModal open={showEventModal} onOpenChange={setShowEventModal} onAttachEvent={handleAttachEvent} />
      {chat && currentUser && (
        <ScheduleCallModal
          open={showCallModal}
          onOpenChange={setShowCallModal}
          chat={chat}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}