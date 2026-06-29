import 'server-only';

import {
  BUFFER_API_BASE,
  BufferAuthExpiredError,
  getValidBufferAccessToken,
} from '@/lib/buffer/client';

/** Buffer API rate limit — retry after a moment */
export class BufferRateLimitError extends Error {
  constructor(message = 'Buffer is temporarily rate-limited') {
    super(message);
    this.name = 'BufferRateLimitError';
  }
}

export type BufferProfile = {
  id: string;
  service: string;
  formatted_username: string;
  service_username?: string;
  avatar?: string;
  disabled?: boolean;
};

export type BufferPublishPlatform = 'instagram' | 'linkedin' | 'twitter' | 'facebook';

const PLATFORM_TO_BUFFER_SERVICE: Record<BufferPublishPlatform, string[]> = {
  instagram: ['instagram'],
  linkedin: ['linkedin'],
  twitter: ['twitter'],
  facebook: ['facebook'],
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const profileCache = new Map<string, { profiles: BufferProfile[]; expiresAt: number }>();

function parseBufferError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as { message?: string; error?: string };
    return d.message || d.error || fallback;
  }
  return fallback;
}

async function bufferFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429) {
    throw new BufferRateLimitError(
      'Buffer is temporarily rate-limited — try again in a moment'
    );
  }
  return res;
}

export function bufferServicesForPlatform(platform: string): string[] {
  return PLATFORM_TO_BUFFER_SERVICE[platform as BufferPublishPlatform] ?? [];
}

export function isBufferPublishPlatform(platform: string): platform is BufferPublishPlatform {
  return platform in PLATFORM_TO_BUFFER_SERVICE;
}

export function matchProfilesForPlatform(
  profiles: BufferProfile[],
  platform: BufferPublishPlatform
): BufferProfile[] {
  const services = PLATFORM_TO_BUFFER_SERVICE[platform];
  return profiles.filter(
    (p) => !p.disabled && services.some((s) => p.service.toLowerCase() === s)
  );
}

export async function getBufferProfiles(
  accessToken: string,
  userId?: string
): Promise<BufferProfile[]> {
  if (userId) {
    const cached = profileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profiles;
    }
  }

  const res = await bufferFetch(
    `${BUFFER_API_BASE}/profiles.json?access_token=${encodeURIComponent(accessToken)}`
  );

  const data = (await res.json()) as BufferProfile[] | { message?: string; error?: string };

  if (!res.ok) {
    throw new Error(parseBufferError(data, 'Failed to load Buffer profiles'));
  }

  if (!Array.isArray(data)) {
    throw new Error('Unexpected Buffer profiles response');
  }

  const profiles = data.filter((p) => p?.id && p?.service);

  if (userId) {
    profileCache.set(userId, {
      profiles,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return profiles;
}

export async function getBufferProfilesForUser(userId: string): Promise<BufferProfile[]> {
  const accessToken = await getValidBufferAccessToken(userId);
  return getBufferProfiles(accessToken, userId);
}

export type CreateBufferUpdateInput = {
  accessToken: string;
  profileId: string;
  text: string;
  /** ISO datetime — omit or null for Buffer's next available slot (now=true) */
  scheduledAt?: string | null;
};

export type CreateBufferUpdateResult = {
  updateId: string;
  scheduledAt: string | null;
};

export async function createBufferUpdate(
  input: CreateBufferUpdateInput
): Promise<CreateBufferUpdateResult> {
  const body = new URLSearchParams();
  body.set('access_token', input.accessToken);
  body.set('text', input.text);
  body.append('profile_ids[]', input.profileId);

  if (input.scheduledAt) {
    const unix = Math.floor(new Date(input.scheduledAt).getTime() / 1000);
    body.set('scheduled_at', String(unix));
  } else {
    body.set('now', 'true');
  }

  const res = await bufferFetch(`${BUFFER_API_BASE}/updates/create.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    success?: boolean;
    buffer?: { id?: string; due_at?: number; scheduled_at?: number };
    message?: string;
    error?: string;
  };

  if (!res.ok || data.success === false) {
    const msg = parseBufferError(data, 'Buffer failed to schedule post');
    if (res.status === 401 || /token|auth|expired/i.test(msg)) {
      throw new BufferAuthExpiredError(msg);
    }
    throw new Error(msg);
  }

  const updateId = data.buffer?.id;
  if (!updateId) {
    throw new Error('Buffer did not return an update id');
  }

  const dueUnix = data.buffer?.due_at ?? data.buffer?.scheduled_at;
  const scheduledAt =
    dueUnix != null ? new Date(dueUnix * 1000).toISOString() : input.scheduledAt ?? null;

  return { updateId, scheduledAt };
}

export async function publishToBufferForUser(params: {
  userId: string;
  platform: BufferPublishPlatform;
  text: string;
  profileId?: string;
  scheduledAt?: string | null;
}): Promise<CreateBufferUpdateResult & { profileId: string; profileLabel: string }> {
  const accessToken = await getValidBufferAccessToken(params.userId);
  const profiles = await getBufferProfiles(accessToken, params.userId);
  const matches = matchProfilesForPlatform(profiles, params.platform);

  if (matches.length === 0) {
    throw new Error(
      `No Buffer profile connected for ${params.platform}. Connect that channel in Buffer first.`
    );
  }

  let profile = matches[0];
  if (params.profileId) {
    const picked = matches.find((p) => p.id === params.profileId);
    if (!picked) {
      throw new Error('Selected Buffer profile not found for this platform');
    }
    profile = picked;
  } else if (matches.length > 1) {
    throw new Error('multiple_profiles');
  }

  const result = await createBufferUpdate({
    accessToken,
    profileId: profile.id,
    text: params.text,
    scheduledAt: params.scheduledAt,
  });

  return {
    ...result,
    profileId: profile.id,
    profileLabel: profile.formatted_username || profile.service_username || profile.service,
  };
}

export { BufferAuthExpiredError };
