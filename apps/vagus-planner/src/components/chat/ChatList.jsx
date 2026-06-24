import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatList({ conversations, selectedConversation, onSelectConversation }) {
  return (
    <div className="h-full bg-white border-r border-slate-200 overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-emerald-600 text-white">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>
      
      <div className="divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start chatting with someone!</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <motion.button
              key={conv.conversation_id}
              whileHover={{ backgroundColor: '#f8fafc' }}
              onClick={() => onSelectConversation(conv.conversation_id)}
              className={cn(
                "w-full p-4 text-left transition-colors",
                selectedConversation === conv.conversation_id && "bg-emerald-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {conv.participant_name || conv.conversation_id}
                    </p>
                    <span className="text-xs text-slate-400">
                      {format(new Date(conv.last_message_date), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {conv.last_message}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}