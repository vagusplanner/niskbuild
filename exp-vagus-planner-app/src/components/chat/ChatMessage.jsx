import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatMessage({ message, isOwn, currentUserEmail }) {
  const isRead = message.is_read;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex mb-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn("max-w-[85%] sm:max-w-[75%] md:max-w-[65%]")}>
        {!isOwn && message.sender_name && (
          <p className="text-[11px] font-semibold mb-1 px-2" style={{ color: '#00897b' }}>
            {message.sender_name}
          </p>
        )}
        <div
          className={cn(
            "rounded-lg px-3 py-2 shadow-md relative",
            isOwn 
              ? "bg-[#dcf8c6] text-[#303030]" 
              : "bg-white text-[#303030]"
          )}
          style={{
            borderBottomRightRadius: isOwn ? '2px' : '8px',
            borderBottomLeftRadius: isOwn ? '8px' : '2px',
          }}
        >
          {/* Message content with attachments */}
          {message.attachments?.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.attachments.map((file, idx) => (
                <div key={idx} className="p-2 bg-white/50 rounded border border-slate-200/50">
                  <p className="text-xs text-slate-600 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-[14.2px] leading-[19px] break-words whitespace-pre-wrap">
            {message.message}
          </p>
          
          {/* Time and status */}
          <div className="flex items-center justify-end gap-1 mt-1 min-w-[60px]">
            <span className="text-[11px]" style={{ color: isOwn ? '#667781' : '#8696a0' }}>
              {format(new Date(message.created_date), 'HH:mm')}
            </span>
            {isOwn && (
              <div className="flex items-center">
                {isRead ? (
                  <CheckCheck className="w-[14px] h-[14px] text-[#53bdeb]" />
                ) : (
                  <Check className="w-[14px] h-[14px] text-[#667781]" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}