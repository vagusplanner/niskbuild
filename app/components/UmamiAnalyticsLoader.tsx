"use client";

import dynamic from 'next/dynamic';

const UmamiAnalytics = dynamic(() => import('@/app/components/UmamiAnalytics'), {
  ssr: false,
});

export default function UmamiAnalyticsLoader() {
  return <UmamiAnalytics />;
}
