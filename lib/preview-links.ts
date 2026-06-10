import 'server-only';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export function generatePreviewToken(): string {
  return randomBytes(16).toString('base64url');
}

export function previewPublicUrl(token: string): string {
  const previewHost = process.env.NEXT_PUBLIC_PREVIEW_HOST || 'preview.niskbuild.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://niskbuild.com';
  if (process.env.NODE_ENV === 'development') {
    return `${appUrl}/preview/${token}`;
  }
  return `https://${previewHost}/${token}`;
}

export async function deactivatePreviewsForUser(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('previews')
    .update({ is_active: false, expired_at: now, updated_at: now })
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');

  return data?.length ?? 0;
}

export async function deactivatePreviewsByEmail(email: string): Promise<number> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile?.id) return 0;
  return deactivatePreviewsForUser(profile.id);
}

export async function reactivatePreviewsForUser(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('previews')
    .update({ is_active: true, expired_at: null, updated_at: now })
    .eq('user_id', userId)
    .eq('is_active', false)
    .select('id');

  const count = data?.length ?? 0;

  if (count > 0) {
    await supabase
      .from('profiles')
      .update({ preview_restore_count: count })
      .eq('id', userId);
  }

  return count;
}

export async function getPreviewStatusForUser(userId: string): Promise<{
  active: number;
  expired: number;
  subscriptionActive: boolean;
}> {
  const supabase = createAdminClient();

  const [{ data: profile }, { count: active }, { count: expired }] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single(),
    supabase
      .from('previews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('previews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', false),
  ]);

  const tier = profile?.subscription_tier ?? 'free';
  const subscriptionActive =
    tier !== 'free' && profile?.subscription_status === 'active';

  return {
    active: active ?? 0,
    expired: expired ?? 0,
    subscriptionActive,
  };
}

export async function upsertPreview(
  userId: string,
  html: string,
  title?: string
): Promise<{ token: string; url: string } | null> {
  const supabase = createAdminClient();
  const token = generatePreviewToken();
  const now = new Date().toISOString();

  const { error } = await supabase.from('previews').insert({
    user_id: userId,
    token,
    title: title || 'NiskBuild Preview',
    html_content: html,
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.error('Preview insert error:', error.message);
    return null;
  }

  return { token, url: previewPublicUrl(token) };
}
