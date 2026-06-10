"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getProjectLimit, isUnlimitedTier } from '@/lib/project-limits';

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
      setLimit(getProjectLimit(userTier));
    };
    
    fetchTier();
  }, [userId]);

  if (isUnlimitedTier(tier)) {
    return <span className="text-xs text-[var(--success)]">{currentCount} projects · unlimited plan</span>;
  }

  const percentage = limit > 0 ? (currentCount / limit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const atLimit = currentCount >= limit;

  return (
    <span
      className={`text-xs ${
        atLimit ? 'text-[var(--error)]' : isNearLimit ? 'text-yellow-500' : 'text-nisk-muted'
      }`}
    >
      {currentCount}/{limit} projects · {tier} tier
    </span>
  );
}