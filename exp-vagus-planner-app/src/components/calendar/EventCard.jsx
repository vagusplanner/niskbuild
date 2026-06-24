import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Bell, Repeat, MoreVertical, Edit2, Trash2, Share2, MessageCircle, Users } from 'lucide-react';
import TranslateButton from '@/components/translation/TranslateButton';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import ShareEventModal from '@/components/collaboration/ShareEventModal';
import CommentThread from '@/components/collaboration/CommentThread';
import ShareWithTeam from '@/components/collaboration/ShareWithTeam';
import RecurringEventOptions from './RecurringEventOptions';

const categoryStyles = {
  work: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  personal: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  health: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  prayer: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  holiday: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  family: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-500' },
  social: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  other: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' }
};

function EventCard({ event, onEdit, onDelete, index = 0 }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTeamShare, setShowTeamShare] = useState(false);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [recurringAction, setRecurringAction] = useState('edit');
  const style = categoryStyles[event.category] || categoryStyles.other;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  // Fetch unread message count for this event
  const conversationId = `event_${event.id}`;
  const { data: messages = [] } = useQuery({
    queryKey: ['eventChat', conversationId],
    queryFn: () => SDK.entities.Chat.filter({ conversation_id: conversationId })
  });

  const unreadCount = messages.filter(m => m.sender_email !== user?.email && !m.is_read).length;
  const hasMentions = messages.some(m => 
    (m.message.includes(`@${user?.email}`) || m.message.includes(`@${user?.full_name}`)) &&
    m.sender_email !== user?.email &&
    !m.is_read
  );

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-4 rounded-xl border transition-all hover:shadow-md",
        style.bg, style.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", style.dot)} />
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-semibold truncate", style.text)}>
              {event.title}
            </h4>
            
            {event.description && (
              <div className="mt-1">
                <p className="text-sm text-slate-500 line-clamp-2">
                  {event.description}
                </p>
                <div className="mt-1">
                  <TranslateButton text={event.description} variant="ghost" size="sm" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {(event.start_time || event.is_all_day) && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.is_all_day ? 'All day' : `${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}`}
                </span>
              )}
              
              {event.location && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}

              {event.is_recurring && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {event.recurrence_type}
                </span>
              )}

              {event.reminder_minutes && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {event.reminder_minutes}m
                </span>
              )}

              {messages.length > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1 relative">
                  <MessageCircle className="w-3 h-3" />
                  {messages.length}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1 absolute -top-1 -right-1">
                      {unreadCount}
                    </Badge>
                  )}
                  {hasMentions && (
                    <span className="text-yellow-600">@</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <button className="p-1 rounded-lg hover:bg-white/50 transition-colors">
               <MoreVertical className="w-4 h-4 text-slate-400" />
             </button>
           </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              if (event.is_recurring && event.parent_recurring_event_id) {
                setRecurringAction('edit');
                setShowRecurringOptions(true);
              } else {
                onEdit(event);
              }
            }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share with User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTeamShare(true)}>
              <Users className="w-4 h-4 mr-2" />
              Share with Team
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                if (event.is_recurring && event.parent_recurring_event_id) {
                  setRecurringAction('delete');
                  setShowRecurringOptions(true);
                } else {
                  onDelete(event.id);
                }
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
    
    <AnimatePresence>
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 overflow-hidden"
        >
          <div className={cn("p-4 rounded-xl border", style.bg, style.border)}>
            <CommentThread entityType="event" entityId={event.id} compact />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    
    <ShareEventModal
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      event={event}
    />
    
    <ShareWithTeam
      isOpen={showTeamShare}
      onClose={() => setShowTeamShare(false)}
      entityType="event"
      entityId={event.id}
    />
    
    <RecurringEventOptions
      isOpen={showRecurringOptions}
      onClose={() => setShowRecurringOptions(false)}
      action={recurringAction}
      onEditThis={() => {
        setShowRecurringOptions(false);
        onEdit({ ...event, edit_single_occurrence: true });
      }}
      onEditSeries={() => {
        setShowRecurringOptions(false);
        onEdit({ ...event, edit_single_occurrence: false });
      }}
      onDeleteThis={() => {
        setShowRecurringOptions(false);
        onDelete(event.id, true);
      }}
      onDeleteSeries={() => {
        setShowRecurringOptions(false);
        onDelete(event.id, false);
      }}
    />
    </>
  );
}

export default EventCard;