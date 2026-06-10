"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ReferralCard() {
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [rewardMonths, setRewardMonths] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadReferralData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const response = await fetch('/api/referral', { credentials: 'include' });
        const data = await response.json();
        setReferralCode(data.referral_code || '');
        setReferralCount(data.referral_count || 0);
        setRewardMonths(Math.floor((data.referral_count || 0) / 3));
      }
      setLoading(false);
    };
    loadReferralData();
  }, []);

  const copyToClipboard = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-nisk-card rounded-xl border border-nisk p-6 text-center text-nisk-muted text-sm">
        Loading referral...
      </div>
    );
  }

  const nextReward = 3 - (referralCount % 3);
  const progressPercent = ((referralCount % 3) / 3) * 100;
  const referralLink =
    typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : '';

  return (
    <div className="bg-nisk-card rounded-xl border border-nisk p-6">
      <h3 className="text-lg font-semibold text-white mb-2">Refer & Earn</h3>
      <p className="text-nisk-muted text-sm mb-4">
        Get <span className="text-[var(--success)] font-bold">1 free month</span> for every 3 friends who upgrade to Pro.
      </p>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-nisk-muted mb-1">
          <span>Progress: {referralCount % 3}/3 referrals</span>
          <span>Rewards: {rewardMonths} month{rewardMonths !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-full bg-nisk-surface rounded-full h-2">
          <div
            className="bg-gradient-brand h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {nextReward > 0 && nextReward < 3 && (
          <p className="text-xs text-nisk-muted mt-2">
            {nextReward} more referral{nextReward !== 1 ? 's' : ''} until your next free month.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 bg-nisk border border-nisk rounded-lg p-2 text-sm text-white"
        />
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-gradient-brand rounded-lg text-sm font-medium text-white"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}