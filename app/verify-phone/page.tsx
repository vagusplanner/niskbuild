"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/app/components/Layout';
import PhoneVerification from '@/app/components/PhoneVerification';
import { getSafeSession } from '@/lib/supabaseSession';
import { createClient } from '@/lib/supabase/client';
import { hasPaidTier } from '@/lib/access';

function VerifyPhoneContent() {
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

      if (paid || profile?.phone_verified) {
        router.replace('/dashboard');
        return;
      }

      setChecking(false);
    };
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Verify your phone</h1>
      <p className="text-sm text-nisk-muted text-center mb-6">
        Free Sandbox accounts require phone verification after email confirmation. Paid plans skip
        this step.
      </p>
      <PhoneVerification
        onVerified={() => {
          router.replace('/dashboard?welcome=1');
        }}
      />
      <p className="text-center text-xs text-nisk-muted mt-6">
        <Link href="/pricing" className="text-[var(--accent-cyan)] hover:underline">
          Upgrade to Pro
        </Link>{' '}
        to skip phone verification
      </p>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <VerifyPhoneContent />
      </Suspense>
    </Layout>
  );
}
