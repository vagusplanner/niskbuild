export type AuthProductBrand = 'niskbuild' | 'supereduc8';

export type AuthBrandCopy = {
  productName: string;
  signInTitle: string;
  signInSubtitle: string;
  resetSubtitle: string;
  verifyTitle: string;
  verifySubtitle: string;
  verifySkipHint: string | null;
  backHref: string | null;
  backLabel: string | null;
  termsHref: string;
  privacyHref: string;
  defaultNext: string;
  postVerifyPath: string;
};

export const AUTH_BRAND_COPY: Record<AuthProductBrand, AuthBrandCopy> = {
  niskbuild: {
    productName: 'NiskBuild',
    signInTitle: 'Sign in to NiskBuild',
    signInSubtitle:
      'Sign in or create an account. You can start building for free (Sandbox) — upgrade anytime for Marketplace, exports, and higher limits.',
    resetSubtitle: 'Choose a new password for your NiskBuild account.',
    verifyTitle: 'Verify your phone',
    verifySubtitle:
      'Free Sandbox accounts require phone verification after email confirmation. Paid plans skip this step.',
    verifySkipHint: 'Upgrade to Pro',
    backHref: '/landing-v2',
    backLabel: '← Back to Landing',
    termsHref: '/terms',
    privacyHref: '/privacy',
    defaultNext: '/pricing',
    postVerifyPath: '/builder?welcome=1',
  },
  supereduc8: {
    productName: 'SuperEduc8',
    signInTitle: 'Sign in to SuperEduc8',
    signInSubtitle:
      'Sign in or create an account to continue studying with your AI study companion.',
    resetSubtitle: 'Choose a new password for your SuperEduc8 account.',
    verifyTitle: 'Verify your phone',
    verifySubtitle:
      'Please verify your phone number to finish setting up your SuperEduc8 account.',
    verifySkipHint: null,
    backHref: null,
    backLabel: null,
    termsHref: '/terms',
    // Host-aware: on supereduc8.com /privacy serves the SuperEduc8 children's policy
    // (not NiskBuild's adult policy). See app/privacy/page.tsx.
    privacyHref: '/privacy',
    defaultNext: '/dashboard',
    postVerifyPath: '/dashboard',
  },
};
