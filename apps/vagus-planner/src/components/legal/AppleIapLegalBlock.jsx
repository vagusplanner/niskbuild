/**
 * Apple Guideline 3.1.2 — Terms (EULA), Privacy, and auto-renew disclosure.
 * iOS native only. Do not show on web/Android.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { isIosNativeApp } from '@/lib/vp-platform';
import {
  APPLE_STANDARD_EULA_URL,
  VP_PUBLIC_PRIVACY_URL,
  openExternalUrl,
} from '@/lib/open-external-url';

const DISCLOSURE =
  'Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in Settings > Apple ID > Subscriptions.';

function LegalLink({ href, children }) {
  return (
    <button
      type="button"
      className="text-[#1D6FB8] dark:text-sky-400 underline underline-offset-2 font-medium text-left"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openExternalUrl(href);
      }}
    >
      {children}
    </button>
  );
}

export default function AppleIapLegalBlock({ className }) {
  if (!isIosNativeApp()) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2.5 space-y-2',
        className
      )}
      data-testid="apple-iap-legal-block"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <LegalLink href={APPLE_STANDARD_EULA_URL}>Terms of Use (EULA)</LegalLink>
        <span className="text-slate-300 dark:text-slate-600" aria-hidden>
          ·
        </span>
        <LegalLink href={VP_PUBLIC_PRIVACY_URL}>Privacy Policy</LegalLink>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{DISCLOSURE}</p>
    </div>
  );
}
