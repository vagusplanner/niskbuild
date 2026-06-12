"use client";

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (key && host && typeof window !== 'undefined') {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        disable_cookie: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
        },
      });
    }
  }, []);

  return null;
}
