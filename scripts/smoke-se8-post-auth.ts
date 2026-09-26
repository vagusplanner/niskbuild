import {
  resolvePostAuthPath,
  resolvePostAuthProduct,
  resolvePostAuthProductFromRequest,
  resolvePostAuthRedirectUrl,
  sanitizeSuperEduc8NextPath,
} from '@/lib/post-auth-redirect';

const free = {
  subscription_tier: 'free',
  subscription_status: 'inactive',
  phone_verified: false,
};

const freePhoneOk = {
  ...free,
  phone_verified: true,
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(resolvePostAuthPath(free, '/dashboard') === '/verify-phone', 'NB free → phone');
assert(
  resolvePostAuthPath(freePhoneOk, '/dashboard') === '/pricing?welcome=1',
  'NB free+phone → pricing (the bug class that hit SE8 via wrong product)'
);

assert(
  resolvePostAuthPath(free, '/dashboard', { product: 'supereduc8' }) === '/dashboard',
  'SE8 free → dashboard'
);
assert(
  resolvePostAuthPath(freePhoneOk, '/pricing', {
    product: 'supereduc8',
    isPlatformOwner: true,
  }) === '/dashboard',
  'SE8 owner + pricing next → dashboard (never NiskBuild pricing)'
);
assert(
  resolvePostAuthPath(freePhoneOk, '/pricing?welcome=1', { product: 'supereduc8' }) ===
    '/dashboard',
  'SE8 unpaid non-owner + pricing next → dashboard'
);
assert(
  sanitizeSuperEduc8NextPath('/builder/shift-ai/dashboard') === '/dashboard',
  'internal shift path → clean /dashboard'
);
assert(
  resolvePostAuthProductFromRequest({
    hostOrOrigin: 'https://www.niskbuild.com',
    productParam: 'supereduc8',
  }) === 'supereduc8',
  'product query survives Site URL fallback'
);

const bounced = resolvePostAuthRedirectUrl({
  destinationPath: '/dashboard',
  callbackOrigin: 'https://www.niskbuild.com',
  product: 'supereduc8',
});
assert(
  bounced.startsWith('https://www.supereduc8.com/'),
  `SE8 product on NB callback origin must bounce to SE8, got ${bounced}`
);

assert(resolvePostAuthProduct('www.supereduc8.com') === 'supereduc8', 'host SE8');
assert(resolvePostAuthProduct('https://www.niskbuild.com') === 'niskbuild', 'host NB');

console.log('post-auth-redirect OK');
