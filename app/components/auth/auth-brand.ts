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
  /**
   * When set, the shared login form's "Sign Up" tab redirects here instead of
   * showing the NiskBuild DOB-gated signup (used by SuperEduc8).
   */
  dedicatedSignupHref: string | null;
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
    dedicatedSignupHref: null,
  },
  supereduc8: {
    productName: 'SuperEduc8',
    signInTitle: 'Sign in to SuperEduc8',
    signInSubtitle:
      'Sign in to continue studying — or create an account via SuperEduc8 signup (self-serve 13+, or parent consent for under 13).',
    resetSubtitle: 'Choose a new password for your SuperEduc8 account.',
    verifyTitle: 'Continue to SuperEduc8',
    verifySubtitle:
      'Phone verification is not required for SuperEduc8. Redirecting you to your study dashboard…',
    verifySkipHint: null,
    backHref: null,
    backLabel: null,
    termsHref: '/terms',
    // Host-aware: on supereduc8.com /privacy and /terms serve SuperEduc8 policies
    // (not NiskBuild's adult pages). See app/privacy and app/terms.
    privacyHref: '/privacy',
    defaultNext: '/dashboard',
    postVerifyPath: '/dashboard',
    /** Dedicated age/parental-consent signup — shared DOB form must not be used. */
    dedicatedSignupHref: '/signup',
  },
};
