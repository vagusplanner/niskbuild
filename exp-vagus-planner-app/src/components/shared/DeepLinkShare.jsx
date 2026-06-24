/**
 * DeepLinkShare — copy link or native share for any entity.
 * Usage: <DeepLinkShare path="/Calendar?event=123" title="Team Meeting" />
 */
import React, { useState } from 'react';
import { Share2, Link, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DeepLinkShare({ path, title = '', description = '', compact = false, className = '' }) {
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}${path}`;

  const copyLink = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      await navigator.share({ title, text: description, url });
    } else {
      copyLink(e);
    }
  };

  if (compact) {
    return (
      <button onClick={nativeShare}
        className={cn('p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all', className)}
        title="Share link">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:text-teal-600 transition-all">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Link className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      {navigator.share && (
        <button onClick={nativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:text-teal-600 transition-all">
          <Share2 className="w-3 h-3" /> Share
        </button>
      )}
    </div>
  );
}