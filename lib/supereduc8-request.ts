import 'server-only';

import { headers } from 'next/headers';
import { isSuperEduc8Host } from '@/lib/supereduc8-host';

/** True when the current request Host is a SuperEduc8 product domain. */
export async function isSuperEduc8Request(): Promise<boolean> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(':')[0];
  return isSuperEduc8Host(host);
}
