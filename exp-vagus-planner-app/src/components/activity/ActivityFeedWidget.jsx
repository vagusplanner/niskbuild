import React from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ActivityFeed from './ActivityFeed';

export default function ActivityFeedWidget() {
  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#1a7ab8]" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Activity Feed</span>
          <span className="relative flex h-1.5 w-1.5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        </div>
        <Link to={createPageUrl('ActivityFeed')}
          className="flex items-center gap-1 text-xs text-[#1a7ab8] hover:text-[#3ecfa0] font-semibold transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-3">
        <ActivityFeed compact maxItems={5} />
      </div>
    </div>
  );
}