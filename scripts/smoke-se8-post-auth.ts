import {
  resolvePostAuthPath,
  resolvePostAuthProduct,
} from '@/lib/post-auth-redirect';

const free = {
  subscription_tier: 'free',
  subscription_status: 'inactive',
  phone_verified: false,
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(resolvePostAuthPath(free, '/dashboard') === '/verify-phone', 'NB free → phone');
assert(
  resolvePostAuthPath(free, '/dashboard', { product: 'supereduc8' }) === '/dashboard',
  'SE8 free → dashboard'
);
assert(
  resolvePostAuthPath(free, '/pricing', { product: 'supereduc8' }) === '/dashboard',
  'SE8 ignores pricing funnel'
);
assert(
  resolvePostAuthPath(free, '/assistant', { product: 'supereduc8' }) === '/assistant',
  'SE8 keeps assistant next'
);
assert(resolvePostAuthProduct('www.supereduc8.com') === 'supereduc8', 'host SE8');
assert(resolvePostAuthProduct('https://www.niskbuild.com') === 'niskbuild', 'host NB');

console.log('post-auth-redirect OK');
