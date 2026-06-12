"use client";

import { useEffect } from 'react';

export default function UmamiAnalytics() {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://analytics.umami.is/script.js';

    if (websiteId && !document.querySelector('#umami-script')) {
      const script = document.createElement('script');
      script.id = 'umami-script';
      script.src = `${scriptUrl}?data-website-id=${websiteId}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
