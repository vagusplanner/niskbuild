import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  SOCIAL_SYSTEM_PROMPT,
  blueprintContextForSocial,
  parseSocialPosts,
  type SocialPostKey,
  type SocialPosts,
} from '@/lib/social-publisher';
import { getGroqClient } from '@/lib/groq-client';
import {
  createBufferCompanyPost,
  isBufferPersonalConfigured,
  listAllBufferChannels,
  type CreateCompanyPostMode,
  type BufferGraphqlChannel,
} from '@/lib/buffer-personal/graphql-client';

export const COMPANY_POST_SOURCE = 'company_buffer';
export const REMINDER_DAYS = 3;

/** Map Buffer channel.service → AI post key (and social_posts.platform). */
export function serviceToPlatformKey(service: string): SocialPostKey | null {
  const s = service.toLowerCase();
  if (s.includes('instagram')) return 'instagram';
  if (s.includes('linkedin')) return 'linkedin';
  if (s === 'twitter' || s === 'x') return 'twitter';
  if (s.includes('facebook')) return 'facebook';
  return null;
}

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / (24 * 60 * 60 * 1000));
}

export async function getLastCompanyPostAt(): Promise<string | null> {
  const admin = createAdminClient();
  const { data: config } = await admin
    .schema('firstparty')
    .from('social_hub_config')
    .select('last_company_post_at')
    .eq('id', 'default')
    .maybeSingle();

  if (config?.last_company_post_at) {
    return config.last_company_post_at as string;
  }

  // Fallback: latest company row that left draft
  const { data: row } = await admin
    .schema('firstparty')
    .from('social_posts')
    .select('created_at, updated_at, scheduled_at, status, metadata')
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .in('status', ['published', 'queued', 'scheduled'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (row?.scheduled_at as string) || (row?.updated_at as string) || null;
}

export async function touchLastCompanyPostAt(iso = new Date().toISOString()): Promise<void> {
  const admin = createAdminClient();
  const firstparty = admin.schema('firstparty');
  const { data: existing } = await firstparty
    .from('social_hub_config')
    .select('id')
    .eq('id', 'default')
    .maybeSingle();

  if (existing) {
    await firstparty
      .from('social_hub_config')
      .update({ last_company_post_at: iso, updated_at: iso })
      .eq('id', 'default');
    return;
  }

  await firstparty.from('social_hub_config').insert({
    id: 'default',
    last_company_post_at: iso,
    updated_at: iso,
  });
}

export async function generateCompanySocialPosts(promptHint?: string): Promise<SocialPosts> {
  const groq = getGroqClient();
  if (!groq) throw new Error('AI service unavailable');

  const prompt =
    promptHint?.trim() ||
    'NiskBuild — AI app builder. Own your code forever. Describe apps in plain English and get real HTML/CSS/JS. For freelancers, agencies, and companies.';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SOCIAL_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Blueprint:\n${blueprintContextForSocial(null, prompt)}`,
      },
    ],
    temperature: 0.65,
    max_tokens: 2500,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '';
  const posts = parseSocialPosts(raw);
  if (!posts) throw new Error('Failed to parse social posts from AI response');
  return posts;
}

export type CompanyDraftRow = {
  id: string;
  platform: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  channelId: string | null;
  channelName: string | null;
  service: string | null;
};

export async function listCompanyDrafts(): Promise<CompanyDraftRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      platform: row.platform as string,
      body: row.body as string,
      status: row.status as string,
      scheduledAt: (row.scheduled_at as string) || null,
      createdAt: row.created_at as string,
      channelId: typeof meta.channelId === 'string' ? meta.channelId : null,
      channelName: typeof meta.channelName === 'string' ? meta.channelName : null,
      service: typeof meta.service === 'string' ? meta.service : null,
    };
  });
}

export async function saveCompanyDraft(params: {
  userId: string;
  platform: string;
  body: string;
  channel: BufferGraphqlChannel & { organizationId?: string; organizationName?: string };
}): Promise<CompanyDraftRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .insert({
      user_id: params.userId,
      platform: params.platform,
      body: params.body,
      status: 'draft',
      metadata: {
        source: COMPANY_POST_SOURCE,
        channelId: params.channel.id,
        channelName: params.channel.displayName || params.channel.name,
        service: params.channel.service,
        organizationId: params.channel.organizationId ?? null,
      },
    })
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .single();

  if (error) throw new Error(error.message);

  const meta = (data.metadata || {}) as Record<string, unknown>;
  return {
    id: data.id as string,
    platform: data.platform as string,
    body: data.body as string,
    status: data.status as string,
    scheduledAt: (data.scheduled_at as string) || null,
    createdAt: data.created_at as string,
    channelId: typeof meta.channelId === 'string' ? meta.channelId : null,
    channelName: typeof meta.channelName === 'string' ? meta.channelName : null,
    service: typeof meta.service === 'string' ? meta.service : null,
  };
}

export async function updateCompanyDraftBody(
  draftId: string,
  body: string
): Promise<CompanyDraftRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq('id', draftId)
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Draft not found');

  const meta = (data.metadata || {}) as Record<string, unknown>;
  return {
    id: data.id as string,
    platform: data.platform as string,
    body: data.body as string,
    status: data.status as string,
    scheduledAt: (data.scheduled_at as string) || null,
    createdAt: data.created_at as string,
    channelId: typeof meta.channelId === 'string' ? meta.channelId : null,
    channelName: typeof meta.channelName === 'string' ? meta.channelName : null,
    service: typeof meta.service === 'string' ? meta.service : null,
  };
}

export async function publishCompanyDraft(params: {
  draftId: string;
  mode: CreateCompanyPostMode;
  dueAt?: string | null;
}): Promise<{ draftId: string; bufferPostId: string; status: string; dueAt: string | null }> {
  const admin = createAdminClient();
  const { data: draft, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .select('*')
    .eq('id', params.draftId)
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!draft) throw new Error('Draft not found');

  const meta = (draft.metadata || {}) as Record<string, unknown>;
  const channelId = typeof meta.channelId === 'string' ? meta.channelId : '';
  if (!channelId) throw new Error('Draft is missing Buffer channelId');

  const result = await createBufferCompanyPost({
    channelId,
    text: draft.body as string,
    mode: params.mode,
    dueAt: params.dueAt,
  });

  const status =
    params.mode === 'shareNow' ? 'published' : params.mode === 'customScheduled' ? 'scheduled' : 'queued';

  const { error: upErr } = await admin
    .schema('firstparty')
    .from('social_posts')
    .update({
      status,
      buffer_update_id: result.postId,
      scheduled_at: result.dueAt,
      updated_at: new Date().toISOString(),
      metadata: {
        ...meta,
        bufferMode: params.mode,
        bufferStatus: result.status,
      },
    })
    .eq('id', params.draftId);

  if (upErr) throw new Error(upErr.message);

  await touchLastCompanyPostAt(result.dueAt || new Date().toISOString());

  return {
    draftId: params.draftId,
    bufferPostId: result.postId,
    status,
    dueAt: result.dueAt,
  };
}

/** Pick up to 3 channels (prefer LinkedIn, X, Instagram) and save AI drafts. */
export async function generateThisWeeksCompanyDrafts(userId: string): Promise<{
  drafts: CompanyDraftRow[];
  skipped: string[];
}> {
  if (!isBufferPersonalConfigured()) {
    throw new Error('BUFFER_PERSONAL_API_KEY is not configured');
  }

  const channels = await listAllBufferChannels();
  const preferredOrder = ['linkedin', 'twitter', 'instagram', 'facebook'];
  const picked: typeof channels = [];
  const usedServices = new Set<string>();

  for (const pref of preferredOrder) {
    const match = channels.find((c) => {
      const key = serviceToPlatformKey(c.service);
      return key === pref && !usedServices.has(pref);
    });
    if (match) {
      picked.push(match);
      usedServices.add(pref);
    }
    if (picked.length >= 3) break;
  }

  // Fill from remaining if < 3
  for (const c of channels) {
    if (picked.length >= 3) break;
    if (picked.some((p) => p.id === c.id)) continue;
    if (!serviceToPlatformKey(c.service)) continue;
    picked.push(c);
  }

  if (picked.length === 0) {
    throw new Error(
      'No Buffer channels mapped to Instagram/LinkedIn/X/Facebook. Connect those channels in Buffer first.'
    );
  }

  const posts = await generateCompanySocialPosts();
  const drafts: CompanyDraftRow[] = [];
  const skipped: string[] = [];

  for (const ch of picked) {
    const platform = serviceToPlatformKey(ch.service);
    if (!platform) {
      skipped.push(ch.service);
      continue;
    }
    const body = posts[platform];
    drafts.push(
      await saveCompanyDraft({
        userId,
        platform,
        body,
        channel: ch,
      })
    );
  }

  return { drafts, skipped };
}
