"use client";

import { useEffect, useState } from 'react';

/**
 * Client-side platform owner check via /api/admin/platform-owner.
 * Auth source of truth: Supabase is_platform_owner() RPC.
 */
export function usePlatformOwner(user: { id?: string } | null | undefined): boolean {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsOwner(false);
      return;
    }

    let cancelled = false;

    fetch('/api/admin/platform-owner', { credentials: 'include' })
      .then((res) => {
        if (!cancelled) setIsOwner(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsOwner(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return isOwner;
}
