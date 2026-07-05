import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getVpFunctionHandler } from './registry';
import type { VpFunctionResult } from './types';

export async function dispatchVpFunction(
  name: string,
  ctx: { request: NextRequest; user: User; payload: Record<string, unknown> }
): Promise<VpFunctionResult | null> {
  const handler = getVpFunctionHandler(name);
  if (!handler) {
    console.warn(`[vp-functions] Not implemented: ${name}`);
    return null;
  }

  return handler(ctx);
}
