import 'server-only';

/**
 * Buffer GraphQL API (personal API key) — company / admin posting only.
 * Separate from legacy OAuth REST client in lib/buffer/ and lib/social-hub/buffer-client.ts.
 */

const BUFFER_GRAPHQL_URL = 'https://api.buffer.com';

export type BufferGraphqlChannel = {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string | null;
  isQueuePaused: boolean;
};

export type BufferGraphqlOrganization = {
  id: string;
  name: string;
};

export type CreateCompanyPostMode = 'shareNow' | 'addToQueue' | 'customScheduled';

/** Instagram PostType enum values required by Buffer GraphQL. */
export type InstagramPostType = 'post' | 'story' | 'reel';

export type BufferPostAsset =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string };

export class BufferPersonalApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BufferPersonalApiError';
  }
}

export function getBufferPersonalApiKey(): string | null {
  const key = process.env.BUFFER_PERSONAL_API_KEY?.trim();
  return key || null;
}

export function isBufferPersonalConfigured(): boolean {
  return Boolean(getBufferPersonalApiKey());
}

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

async function bufferGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const apiKey = getBufferPersonalApiKey();
  if (!apiKey) {
    throw new BufferPersonalApiError(
      'BUFFER_PERSONAL_API_KEY is not configured. Add your Buffer personal API key (Settings → API) to the server env.'
    );
  }

  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(variables ? { query, variables } : { query }),
  });

  if (res.status === 401) {
    throw new BufferPersonalApiError(
      'Buffer rejected the personal API key (401). Check BUFFER_PERSONAL_API_KEY.'
    );
  }
  if (res.status === 429) {
    throw new BufferPersonalApiError('Buffer rate limit hit — try again shortly.');
  }

  const json = (await res.json()) as GraphqlResponse<T>;
  if (json.errors?.length) {
    throw new BufferPersonalApiError(
      json.errors.map((e) => e.message || 'GraphQL error').join('; ')
    );
  }
  if (!json.data) {
    throw new BufferPersonalApiError('Empty response from Buffer GraphQL API');
  }
  return json.data;
}

export async function listBufferOrganizations(): Promise<BufferGraphqlOrganization[]> {
  const data = await bufferGraphql<{
    account: { organizations: BufferGraphqlOrganization[] };
  }>(`
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);
  return data.account?.organizations ?? [];
}

export async function listBufferChannels(
  organizationId: string
): Promise<BufferGraphqlChannel[]> {
  const data = await bufferGraphql<{
    channels: BufferGraphqlChannel[];
  }>(
    `
    query GetChannels($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id
        name
        displayName
        service
        avatar
        isQueuePaused
      }
    }
  `,
    { organizationId }
  );
  return data.channels ?? [];
}

/** All channels across every org on the personal Buffer account. */
export async function listAllBufferChannels(): Promise<
  Array<BufferGraphqlChannel & { organizationId: string; organizationName: string }>
> {
  const orgs = await listBufferOrganizations();
  const out: Array<BufferGraphqlChannel & { organizationId: string; organizationName: string }> =
    [];
  for (const org of orgs) {
    const channels = await listBufferChannels(org.id);
    for (const ch of channels) {
      out.push({
        ...ch,
        organizationId: org.id,
        organizationName: org.name,
      });
    }
  }
  return out;
}

export type CreateCompanyPostResult = {
  postId: string;
  text: string;
  dueAt: string | null;
  status: string | null;
};

function buildAssetsLiteral(assets: BufferPostAsset[] | undefined): string {
  const list = assets ?? [];
  if (list.length === 0) return 'assets: []';

  const entries = list.map((asset) => {
    const url = JSON.stringify(asset.url);
    if (asset.kind === 'video') {
      return `{ video: { url: ${url} } }`;
    }
    return `{ image: { url: ${url} } }`;
  });

  return `assets: [${entries.join(', ')}]`;
}

function buildMetadataLiteral(params: {
  instagramType?: InstagramPostType | null;
  shouldShareToFeed?: boolean;
}): string {
  if (!params.instagramType) return '';

  // shouldShareToFeed is required on InstagramPostMetadataInput
  const shareToFeed = params.shouldShareToFeed ?? params.instagramType === 'post';
  return `metadata: {
        instagram: {
          type: ${params.instagramType}
          shouldShareToFeed: ${shareToFeed}
        }
      }`;
}

export async function createBufferCompanyPost(params: {
  channelId: string;
  text: string;
  mode: CreateCompanyPostMode;
  /** ISO datetime — required when mode is customScheduled */
  dueAt?: string | null;
  /** Public HTTPS media URLs Buffer can fetch (required for Instagram). */
  assets?: BufferPostAsset[];
  /** Required when posting to an Instagram channel. */
  instagramType?: InstagramPostType | null;
  shouldShareToFeed?: boolean;
}): Promise<CreateCompanyPostResult> {
  const text = params.text.trim();
  if (!text) throw new BufferPersonalApiError('Post text is required');
  if (!params.channelId) throw new BufferPersonalApiError('channelId is required');

  if (params.mode === 'customScheduled') {
    if (!params.dueAt) {
      throw new BufferPersonalApiError('dueAt is required for customScheduled posts');
    }
  }

  const dueAtLiteral =
    params.mode === 'customScheduled' && params.dueAt
      ? `dueAt: "${params.dueAt}"`
      : '';

  const assetsLiteral = buildAssetsLiteral(params.assets);
  const metadataLiteral = buildMetadataLiteral({
    instagramType: params.instagramType,
    shouldShareToFeed: params.shouldShareToFeed,
  });

  // Inline enum values — GraphQL enums are not quoted strings.
  const data = await bufferGraphql<{
    createPost:
      | {
          post?: { id?: string; text?: string; dueAt?: string | null; status?: string | null };
          message?: string;
        }
      | null;
  }>(`
    mutation CreateCompanyPost {
      createPost(input: {
        text: ${JSON.stringify(text)}
        channelId: "${params.channelId}"
        schedulingType: automatic
        mode: ${params.mode}
        ${dueAtLiteral}
        ${assetsLiteral}
        ${metadataLiteral}
        source: "niskbuild_admin"
        aiAssisted: true
      }) {
        ... on PostActionSuccess {
          post {
            id
            text
            dueAt
            status
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `);

  const payload = data.createPost;
  if (!payload) {
    throw new BufferPersonalApiError('Buffer createPost returned no payload');
  }
  if (payload.message && !payload.post?.id) {
    throw new BufferPersonalApiError(payload.message);
  }
  if (!payload.post?.id) {
    throw new BufferPersonalApiError('Buffer did not return a post id');
  }

  return {
    postId: payload.post.id,
    text: payload.post.text || text,
    dueAt: payload.post.dueAt ?? params.dueAt ?? null,
    status: payload.post.status ?? null,
  };
}
