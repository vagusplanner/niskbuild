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
  type BufferPostAsset,
  type InstagramPostType,
} from '@/lib/buffer-personal/graphql-client';

export const COMPANY_POST_SOURCE = 'company_buffer';
export const REMINDER_DAYS = 3;
export const COMPANY_SOCIAL_MEDIA_BUCKET = 'project-assets';

const INSTAGRAM_TYPES = new Set<InstagramPostType>(['post', 'story', 'reel']);

export function isInstagramPlatform(platform: string | null | undefined, service?: string | null): boolean {
  if (platform === 'instagram') return true;
  return Boolean(service && service.toLowerCase().includes('instagram'));
}

export function parseInstagramType(value: unknown): InstagramPostType | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase() as InstagramPostType;
  return INSTAGRAM_TYPES.has(v) ? v : null;
}

function mapDraftRow(row: {
  id: string;
  platform: string;
  body: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  metadata: unknown;
}): CompanyDraftRow {
  const meta = (row.metadata || {}) as Record<string, unknown>;
  const mediaKind =
    meta.mediaKind === 'video' ? 'video' : meta.mediaKind === 'image' ? 'image' : null;
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
    mediaUrl: typeof meta.mediaUrl === 'string' ? meta.mediaUrl : null,
    mediaKind,
    instagramType: parseInstagramType(meta.instagramType),
  };
}

export function validateInstagramDraftForPublish(draft: {
  platform: string;
  service?: string | null;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
  instagramType?: InstagramPostType | null;
}): string | null {
  if (!isInstagramPlatform(draft.platform, draft.service)) return null;

  if (!draft.instagramType) {
    return 'Instagram requires a type (post, story, or reel) before publishing.';
  }
  if (!draft.mediaUrl?.trim()) {
    return 'Instagram posts require an image or video attachment.';
  }
  if (draft.instagramType === 'reel' && draft.mediaKind !== 'video') {
    return 'Instagram reels require a video attachment.';
  }
  return null;
}

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
  mediaUrl: string | null;
  mediaKind: 'image' | 'video' | null;
  instagramType: InstagramPostType | null;
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

  return (data ?? []).map((row) => mapDraftRow(row as Parameters<typeof mapDraftRow>[0]));
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
        ...(params.platform === 'instagram' ? { instagramType: 'post' as const } : {}),
      },
    })
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .single();

  if (error) throw new Error(error.message);

  return mapDraftRow(data as Parameters<typeof mapDraftRow>[0]);
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

  return mapDraftRow(data as Parameters<typeof mapDraftRow>[0]);
}

export async function updateCompanyDraftMeta(
  draftId: string,
  patch: {
    body?: string;
    instagramType?: InstagramPostType | null;
    mediaUrl?: string | null;
    mediaKind?: 'image' | 'video' | null;
    clearMedia?: boolean;
  }
): Promise<CompanyDraftRow> {
  const admin = createAdminClient();
  const { data: existing, error: loadErr } = await admin
    .schema('firstparty')
    .from('social_posts')
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .eq('id', draftId)
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .maybeSingle();

  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error('Draft not found');

  const meta = { ...((existing.metadata || {}) as Record<string, unknown>) };

  if (patch.instagramType !== undefined) {
    if (patch.instagramType === null) delete meta.instagramType;
    else meta.instagramType = patch.instagramType;
  }
  if (patch.clearMedia) {
    delete meta.mediaUrl;
    delete meta.mediaKind;
    delete meta.mediaStoragePath;
  } else {
    if (patch.mediaUrl !== undefined) {
      if (patch.mediaUrl === null) delete meta.mediaUrl;
      else meta.mediaUrl = patch.mediaUrl;
    }
    if (patch.mediaKind !== undefined) {
      if (patch.mediaKind === null) delete meta.mediaKind;
      else meta.mediaKind = patch.mediaKind;
    }
  }

  const update: Record<string, unknown> = {
    metadata: meta,
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.body === 'string') {
    update.body = patch.body.trim();
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .update(update)
    .eq('id', draftId)
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Draft not found');

  return mapDraftRow(data as Parameters<typeof mapDraftRow>[0]);
}

export async function attachCompanyDraftMedia(params: {
  draftId: string;
  buffer: Buffer;
  contentType: string;
  fileName?: string;
}): Promise<CompanyDraftRow> {
  const admin = createAdminClient();
  const { data: existing, error: loadErr } = await admin
    .schema('firstparty')
    .from('social_posts')
    .select('id, metadata')
    .eq('id', params.draftId)
    .contains('metadata', { source: COMPANY_POST_SOURCE })
    .eq('status', 'draft')
    .maybeSingle();

  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error('Draft not found');

  const isVideo = params.contentType.startsWith('video/');
  const isImage = params.contentType.startsWith('image/');
  if (!isImage && !isVideo) {
    throw new Error('Media must be an image or video');
  }

  const extFromName = params.fileName?.includes('.')
    ? params.fileName.slice(params.fileName.lastIndexOf('.') + 1).toLowerCase()
    : '';
  const ext =
    extFromName ||
    (params.contentType === 'image/png'
      ? 'png'
      : params.contentType === 'image/webp'
        ? 'webp'
        : params.contentType === 'image/gif'
          ? 'gif'
          : params.contentType.startsWith('video/')
            ? 'mp4'
            : 'jpg');

  const objectPath = `company-social/${params.draftId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(COMPANY_SOCIAL_MEDIA_BUCKET)
    .upload(objectPath, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Media upload failed — ensure the ${COMPANY_SOCIAL_MEDIA_BUCKET} bucket exists and is public: ${uploadError.message}`
    );
  }

  const { data: pub } = admin.storage.from(COMPANY_SOCIAL_MEDIA_BUCKET).getPublicUrl(objectPath);
  const mediaUrl = pub.publicUrl;
  const meta = { ...((existing.metadata || {}) as Record<string, unknown>) };
  meta.mediaUrl = mediaUrl;
  meta.mediaKind = isVideo ? 'video' : 'image';
  meta.mediaStoragePath = objectPath;

  const { data, error } = await admin
    .schema('firstparty')
    .from('social_posts')
    .update({
      metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.draftId)
    .select('id, platform, body, status, scheduled_at, created_at, metadata')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Draft not found after media upload');

  return mapDraftRow(data as Parameters<typeof mapDraftRow>[0]);
}

export async function publishCompanyDraft(params: {
  draftId: string;
  mode: CreateCompanyPostMode;
  dueAt?: string | null;
  instagramType?: InstagramPostType | null;
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

  const mapped = mapDraftRow(draft as Parameters<typeof mapDraftRow>[0]);
  const instagramType = params.instagramType ?? mapped.instagramType;

  const igError = validateInstagramDraftForPublish({
    platform: mapped.platform,
    service: mapped.service,
    mediaUrl: mapped.mediaUrl,
    mediaKind: mapped.mediaKind,
    instagramType,
  });
  if (igError) throw new Error(igError);

  // Soft-check paused queues so addToQueue fails with a clear message
  if (params.mode === 'addToQueue' && isBufferPersonalConfigured()) {
    try {
      const channels = await listAllBufferChannels();
      const ch = channels.find((c) => c.id === channelId);
      if (ch?.isQueuePaused) {
        throw new Error(
          `Buffer queue is paused for ${ch.displayName || ch.name}. Resume the queue in Buffer, or use Publish now / Schedule at time.`
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('queue is paused')) throw e;
      // Ignore channel-list failures — Buffer will still validate on createPost
    }
  }

  if (params.mode === 'customScheduled') {
    if (!params.dueAt) throw new Error('dueAt is required for custom schedule');
    const dueMs = new Date(params.dueAt).getTime();
    if (Number.isNaN(dueMs)) throw new Error('Invalid schedule time (dueAt)');
    if (dueMs <= Date.now() + 60_000) {
      throw new Error('Schedule time must be at least 1 minute in the future');
    }
  }

  const assets: BufferPostAsset[] = [];
  if (mapped.mediaUrl) {
    assets.push({
      kind: mapped.mediaKind === 'video' ? 'video' : 'image',
      url: mapped.mediaUrl,
    });
  }

  const result = await createBufferCompanyPost({
    channelId,
    text: draft.body as string,
    mode: params.mode,
    dueAt: params.dueAt,
    assets,
    instagramType: isInstagramPlatform(mapped.platform, mapped.service)
      ? instagramType
      : null,
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
        ...(instagramType ? { instagramType } : {}),
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
