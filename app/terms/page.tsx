import type { Metadata } from 'next';
import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import NiskBuildTermsPage from './NiskBuildTermsPage';
import SuperEduc8TermsPage from './SuperEduc8TermsPage';

export async function generateMetadata(): Promise<Metadata> {
  if (await isSuperEduc8Request()) {
    return {
      title: 'Terms of Service · SuperEduc8',
      description:
        'Terms of Service for SuperEduc8 — accounts, parental responsibility, pricing, and acceptable use for students ages 7–17.',
      robots: { index: true, follow: true },
    };
  }

  return {
    title: 'Terms of Service · NiskBuild',
    description: 'Terms of Service for the NiskBuild platform.',
    robots: { index: true, follow: true },
  };
}

/**
 * Host-aware terms:
 * - supereduc8.com → SuperEduc8 children's-platform terms
 * - niskbuild.com → NiskBuild adult platform terms
 */
export default async function TermsPage() {
  if (await isSuperEduc8Request()) {
    return <SuperEduc8TermsPage />;
  }
  return <NiskBuildTermsPage />;
}
