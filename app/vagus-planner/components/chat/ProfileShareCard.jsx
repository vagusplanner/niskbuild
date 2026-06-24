import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, X, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ProfileShareCard({ user, onClose }) {
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/connect?invite=${encodeURIComponent(user.email)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(profileUrl)}&bgcolor=ffffff&color=0d6e8a&margin=10`;

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Chat with ${user.full_name} on Vagus`, url: profileUrl });
    } else {
      copyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-72"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-teal-600" />
          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Share Your Profile</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center mb-1">
        <span className="font-semibold text-teal-700 dark:text-teal-400">{user.full_name || user.email.split('@')[0]}</span>
      </p>
      <p className="text-[11px] text-slate-400 text-center mb-4">Scan to start a conversation on Vagus</p>

      {/* Link */}
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-100 transition-colors font-semibold"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button
          onClick={shareLink}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors font-semibold"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>
    </motion.div>
  );
}