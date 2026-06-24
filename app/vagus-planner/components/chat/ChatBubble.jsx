import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PollMessage from './PollMessage';
import ChatEventCard from './ChatEventCard';
import VoiceMessagePlayer from './VoiceMessagePlayer';

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export default function ChatBubble({ message, isOwn, showSender = false, onReact, onReply, replyToMessage, currentUser }) {
  const [showPicker, setShowPicker] = useState(false);
  const time = message.created_date ? format(new Date(message.created_date), 'HH:mm') : '';

  // Group reactions: { emoji: count }
  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  const handleEmojiClick = (emoji) => {
    onReact?.(message, emoji);
    setShowPicker(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={cn('flex mb-1.5 group', isOwn ? 'justify-end' : 'justify-start')}
    >
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mr-2 mt-1">
          {(message.sender_name || message.sender_email || '?').charAt(0).toUpperCase()}
        </div>
      )}

      <div className={cn('max-w-[75%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {showSender && !isOwn && (
          <span className="text-[10px] text-teal-700 font-semibold mb-0.5 ml-1">
            {message.sender_name || message.sender_email?.split('@')[0]}
          </span>
        )}

        {/* Reply context */}
        {replyToMessage && (
          <div className={cn(
            'text-xs px-2.5 py-1.5 rounded-xl mb-0.5 border-l-2 border-teal-400 max-w-full truncate',
            isOwn
              ? 'bg-teal-400/30 text-teal-900 self-end'
              : 'bg-slate-100 text-slate-600 self-start'
          )}>
            <span className="font-semibold mr-1">
              {replyToMessage.sender_name || replyToMessage.sender_email?.split('@')[0]}:
            </span>
            <span className="truncate">{replyToMessage.message}</span>
          </div>
        )}

        {/* Bubble + action buttons row */}
        <div className={cn('flex items-end gap-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>

          {/* Hover actions */}
          <div className={cn(
            'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-1',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}>
            {/* Reply button */}
            <button
              onClick={() => onReply?.(message)}
              className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center hover:bg-teal-50 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Emoji picker trigger */}
            <div className="relative">
              <button
                onClick={() => setShowPicker(p => !p)}
                className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow flex items-center justify-center hover:bg-teal-50 border border-slate-200 dark:border-slate-700 transition-colors text-sm"
                title="React"
              >
                😊
              </button>

              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 4 }}
                    className={cn(
                      'absolute bottom-9 z-30 flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl px-2 py-1.5',
                      isOwn ? 'right-0' : 'left-0'
                    )}
                  >
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="text-lg hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Message bubble */}
          <div>
            {/* Poll */}
            {message.metadata?.poll && (
              <PollMessage message={message} currentUser={currentUser} isGroupChat={!!message.group_chat_id} />
            )}
            {/* Calendar Event card */}
            {message.metadata?.event && !message.metadata?.poll && (
              <ChatEventCard message={message} currentUser={currentUser} />
            )}
            {/* Voice message */}
            {message.metadata?.voice && (
              <VoiceMessagePlayer url={message.metadata.voice.url} duration={message.metadata.voice.duration} isOwn={isOwn} />
            )}
            {/* Regular text bubble */}
            {!message.metadata?.poll && !message.metadata?.event && !message.metadata?.voice && (
              <div
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-sm shadow-sm leading-relaxed',
                  isOwn
                    ? 'bg-teal-500 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm border border-slate-100 dark:border-slate-700'
                )}
              >
                {message.message}
              </div>
            )}
          </div>
        </div>

        {/* Reactions row */}
        {hasReactions && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message, emoji)}
                className="flex items-center gap-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5 shadow-sm hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-slate-500 dark:text-slate-400 font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div className={cn('flex items-center gap-1 mt-0.5 px-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-slate-400">{time}</span>
          {isOwn && (
            message.is_read
              ? <CheckCheck className="w-3 h-3 text-teal-400" />
              : <Check className="w-3 h-3 text-slate-300" />
          )}
        </div>
      </div>
    </motion.div>
  );
}