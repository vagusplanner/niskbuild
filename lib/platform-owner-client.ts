import { supabase } from '@/lib/supabaseClient';

/** Client-side platform owner check via Supabase is_platform_owner() RPC. */
export async function isPlatformOwnerClient(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_owner').single();
  if (error) {
    console.error('is_platform_owner RPC failed:', error.message);
    return false;
  }
  return Boolean(data);
}
