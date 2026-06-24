import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BarChart2, Check } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function PollMessage({ message, currentUser, isGroupChat }) {
  const qc = useQueryClient();
  const poll = message.metadata?.poll;
  if (!poll) return null;

  const totalVotes = (poll.options || []).reduce((s, o) => s + (o.votes?.length || 0), 0);
  const userVoted = poll.options?.some(o => o.votes?.includes(currentUser?.email));

  const vote = async (optionIndex) => {
    if (userVoted) return;
    const updated = {
      ...poll,
      options: poll.options.map((o, i) => ({
        ...o,
        votes: i === optionIndex
          ? [...(o.votes || []), currentUser.email]
          : (o.votes || [])
      }))
    };
    const entity = isGroupChat ? SDK.entities.GroupMessage : SDK.entities.Chat;
    await entity.update(message.id, {
      metadata: { ...message.metadata, poll: updated }
    });
    qc.invalidateQueries({ queryKey: ['groupMessages'] });
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
    toast.success('Vote recorded!');
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 min-w-[220px] max-w-[280px] shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 className="w-4 h-4 text-teal-600" />
        <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">Poll</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2.5">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const votes = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const iVoted = opt.votes?.includes(currentUser?.email);
          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={userVoted}
              className={cn(
                'w-full text-left rounded-xl px-3 py-2 text-sm relative overflow-hidden transition-all border',
                userVoted
                  ? iVoted
                    ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20'
              )}
            >
              {userVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-teal-100 dark:bg-teal-950/30 rounded-xl transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn('font-medium', iVoted ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200')}>
                  {opt.text}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {iVoted && <Check className="w-3.5 h-3.5 text-teal-500" />}
                  {userVoted && <span className="text-xs text-slate-500">{pct}%</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </div>
  );
}