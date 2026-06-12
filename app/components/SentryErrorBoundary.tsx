"use client";

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      Sentry.captureException(error.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return <>{children}</>;
}
