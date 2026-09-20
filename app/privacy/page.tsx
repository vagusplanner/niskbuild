import type { Metadata } from 'next';
import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import NiskBuildPrivacyPage from './NiskBuildPrivacyPage';
import SuperEduc8PrivacyPage from './SuperEduc8PrivacyPage';

export async function generateMetadata(): Promise<Metadata> {
  if (await isSuperEduc8Request()) {
    return {
      title: 'Privacy Policy · SuperEduc8',
      description:
        'How SuperEduc8 collects, stores, and uses data for students, parents, and teachers.',
      robots: { index: true, follow: true },
    };
  }

  return {
    title: 'Privacy Policy · NiskBuild',
    description: 'How NiskBuild collects, uses, stores, and protects your personal data.',
    robots: { index: true, follow: true },
  };
}

/**
 * Host-aware privacy policy:
 * - supereduc8.com → SuperEduc8 children's-data policy
 * - niskbuild.com (and other hosts) → NiskBuild adult platform policy
 */
export default async function PrivacyPage() {
  if (await isSuperEduc8Request()) {
    return <SuperEduc8PrivacyPage />;
  }
  return <NiskBuildPrivacyPage />;
}
