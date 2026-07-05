import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

export type VpFunctionContext = {
  request: NextRequest;
  user: User;
  payload: Record<string, unknown>;
};

export type VpFunctionResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; status?: number };

export type VpFunctionHandler = (ctx: VpFunctionContext) => Promise<VpFunctionResult>;
