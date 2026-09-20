"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhoneVerification from '@/app/components/PhoneVerification';
import SuperEduc8Logo from '@/app/components/SuperEduc8Logo';
import AuthProductShell from '@/app/components/auth/AuthProductShell';
import {
  AUTH_BRAND_COPY,
  type AuthProductBrand,
} from '@/app/components/auth/auth-brand';
import { getSafeSession } from '@/lib/supabaseSession';
import { createClient } from '@/lib/supabase/client';
import { hasPaidTier } from '@/lib/access';
import { isPlatformOwnerClient } from '@/lib/platform-owner-client';
import Layout from '@/app/components/Layout';

function VerifyPhoneContent({ brand }: { brand: AuthProductBrand }) {
  const copy = AUTH_BRAND_COPY[brand];
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        router.replace('/login?next=/verify-phone');
        return;
      }

      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, phone_verified')
        .eq('id', session.user.id)
        .single();

      const paid =
        hasPaidTier(profile?.subscription_tier) &&
        profile?.subscription_status === 'active';

      const platformOwner = await isPlatformOwnerClient();

      if (paid || profile?.phone_verified || platformOwner) {
        router.replace('/dashboard');
        return;
      }

      setChecking(false);
    };
    check();
  }, [router, brand]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      {brand === 'supereduc8' ? (
        <div className="flex justify-center mb-6">
          <SuperEduc8Logo variant="lockup" size="lg" />
        </div>
      ) : null}
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 text-center">
        {copy.verifyTitle}
      </h1>
      <p className="text-sm text-nisk-muted text-center mb-6">{copy.verifySubtitle}</p>
      <PhoneVerification
        onVerified={() => {
          // Full navigation so middleware reads fresh phone_verified (client router.replace can race)
          window.location.replace(copy.postVerifyPath);
        }}
      />
      {copy.verifySkipHint ? (
        <p className="text-center text-xs text-nisk-muted mt-6">
          <Link href="/pricing" className="text-[var(--accent-cyan)] hover:underline">
            {copy.verifySkipHint}
          </Link>{' '}
          to skip phone verification
        </p>
      ) : null}
    </div>
  );
}

export default function VerifyPhoneClient({ brand }: { brand: AuthProductBrand }) {
  const content = (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyPhoneContent brand={brand} />
    </Suspense>
  );

  if (brand === 'supereduc8') {
    return <AuthProductShell brand={brand}>{content}</AuthProductShell>;
  }

  return <Layout>{content}</Layout>;
}
