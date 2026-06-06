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
        const response = await fetch(`/api/referral?userId=${session.user.id}`);
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

  if (loading) return <div className="text-center text-gray-400">Loading...</div>;

  const nextReward = 3 - (referralCount % 3);
  const progressPercent = ((referralCount % 3) / 3) * 100;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-2">Refer & Earn</h3>
      <p className="text-gray-400 text-sm mb-4">
        Get <span className="text-emerald-400 font-bold">1 FREE month</span> for every 3 friends who upgrade to Pro!
      </p>
      
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Progress: {referralCount % 3}/3 referrals</span>
          <span>Rewards earned: {rewardMonths} month{rewardMonths !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {nextReward > 0 && (
          <p className="text-xs text-gray-500 mt-2">{nextReward} more referral{nextReward !== 1 ? 's' : ''} to get 1 free month!</p>
        )}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={`${window.location.origin}/?ref=${referralCode}`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white"
        />
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
        <p className="text-xs text-purple-400">
          💡 Share your link. When they upgrade to Pro, you both get benefits!
        </p>
      </div>
    </div>
  );
}