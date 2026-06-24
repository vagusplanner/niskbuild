import React from 'react';
import { Activity, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ActivityFeed from '@/components/activity/ActivityFeed';

export default function ActivityFeedPage() {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Dashboard')} className="p-2 rounded-lg hover:bg-white/20 transition-colors text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a7ab8] to-[#3ecfa0] flex items-center justify-center shadow">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Activity Feed</h1>
            <p className="text-xs text-slate-500">Real-time updates from across your app</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur rounded-2xl border border-white/60 dark:border-slate-700/50 p-4 shadow-sm">
        <ActivityFeed maxItems={100} />
      </div>
    </div>
  );
}