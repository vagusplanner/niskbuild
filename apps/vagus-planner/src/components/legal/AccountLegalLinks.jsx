/**
 * Account → Privacy & Consent — Privacy Policy + Terms of Use (all platforms).
 * Opens in the external browser so the Cap WebView / Back stack stay intact.
 */
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  APPLE_STANDARD_EULA_URL,
  VP_PUBLIC_PRIVACY_URL,
  openExternalUrl,
} from '@/lib/open-external-url';

function ExternalLegalButton({ href, children }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1D6FB8] dark:text-sky-400 underline underline-offset-2 text-left"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openExternalUrl(href);
      }}
    >
      {children}
      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
    </button>
  );
}

export default function AccountLegalLinks({ className }) {
  return (
    <Card className={cn(className)} data-testid="account-legal-links">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Legal</CardTitle>
        <CardDescription>Privacy Policy and Terms of Use</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5">
        <ExternalLegalButton href={VP_PUBLIC_PRIVACY_URL}>Privacy Policy</ExternalLegalButton>
        <ExternalLegalButton href={APPLE_STANDARD_EULA_URL}>Terms of Use</ExternalLegalButton>
      </CardContent>
    </Card>
  );
}
