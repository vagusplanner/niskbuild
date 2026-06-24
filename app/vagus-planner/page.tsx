'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';

const VAGUS_PLANNER_URL =
  process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() || 'http://localhost:5175';

export default function VagusPlannerEmbedPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSafeSession()
      .then((session) => {
        if (cancelled) return;
        if (session?.user) {
          setReady(true);
        } else {
          router.replace('/login?next=/vagus-planner');
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace('/login?next=/vagus-planner');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading Vagus Planner...</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={VAGUS_PLANNER_URL}
      title="Vagus Planner"
      className="fixed inset-0 h-full w-full border-0"
      allow="clipboard-read; clipboard-write; fullscreen"
    />
  );
}
