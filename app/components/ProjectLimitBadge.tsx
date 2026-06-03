"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ProjectLimitBadgeProps {
  userId: string;
  currentCount: number;
}

export default function ProjectLimitBadge({ userId, currentCount }: ProjectLimitBadgeProps) {
  const [tier, setTier] = useState<string>('free');
  const [limit, setLimit] = useState<number>(1);

  useEffect(() => {
    const fetchTier = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();
      
      const userTier = profile?.subscription_tier || 'free';
      setTier(userTier);
      
      const limits: Record<string, number> = {
        free: 1,
        pro: 3,
        agency: 15,
        scale: 999999,
        white_label: 999999,
      };
      setLimit(limits[userTier] || 1);
    };
    
    fetchTier();
  }, [userId]);

  if (tier === 'scale' || tier === 'white_label') {
    return <span className="text-xs text-emerald-500">📈 Unlimited projects</span>;
  }

  const percentage = (currentCount / limit) * 100;
  const isNearLimit = percentage >= 80;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${isNearLimit ? 'text-yellow-500' : 'text-gray-500'}`}>
        📊 {currentCount}/{limit} projects used ({tier} tier)
      </span>
    </div>
  );
}