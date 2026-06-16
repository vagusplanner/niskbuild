import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type {
  GooglePlacesBusiness,
  SocialProofCounter,
  SocialProofIntel,
  SocialWallPost,
} from '@/lib/google-places-types';

export type { SocialProofIntel, SocialWallPost, SocialProofCounter };

type SocialProofAiResult = {
  instagramHandle?: string;
  facebookPresence?: string;
  tiktokMentionEstimate?: string;
  asSeenOnBadges?: string[];
  counters?: Array<{ label?: string; value?: string }>;
  wallPosts?: Array<{
    platform?: string;
    caption?: string;
    engagement?: string;
  }>;
  photoCaptions?: string[];
};

function parseJsonContent<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function normalizeHandle(raw?: string, businessName?: string): string {
  if (raw) {
    const cleaned = raw.replace(/^@/, '').trim();
    if (cleaned) return cleaned;
  }
  if (businessName) {
    return businessName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  }
  return 'business';
}

function fallbackIntel(business: GooglePlacesBusiness): SocialProofIntel {
  const handle = normalizeHandle(business.suggestedInstagram, business.name);
  const photos = business.photos ?? [];
  const rating = business.rating != null ? `${business.rating}★` : '4.8★';
  const reviews = business.reviewCount != null ? String(business.reviewCount) : '100+';

  return {
    instagramHandle: `@${handle}`,
    instagramProfileUrl: `https://www.instagram.com/${handle}/`,
    facebookPresence: `Active local presence — customers recommend ${business.name} on Facebook`,
    tiktokMentionEstimate: `Growing local buzz on TikTok`,
    asSeenOnBadges: ['Google Reviews', 'Local Favorite', business.businessType || 'Trusted Business'],
    counters: [
      { label: 'Google Rating', value: rating },
      { label: 'Reviews', value: reviews },
      { label: 'Happy Customers', value: `${reviews}+` },
    ],
    wallPosts: photos.slice(0, 6).map((url, i) => ({
      platform: 'instagram' as const,
      caption: business.topPraises?.[i % (business.topPraises.length || 1)] ||
        `Great experience at ${business.name}!`,
      imageUrl: url,
      engagement: `${120 + i * 37} likes`,
    })),
    photoGallery: photos.map((url, i) => ({
      url,
      caption: `${business.name} — ${business.businessType || 'local business'} photo ${i + 1}`,
    })),
    aggregated: true,
  };
}

function buildSocialProofPrompt(business: GooglePlacesBusiness): string {
  const praises = business.topPraises?.join('; ') || 'quality service';
  const photos = (business.photos ?? []).length;

  return `You are a social media strategist building a "Social Wall" for a local business website.

BUSINESS:
- Name: ${business.name}
- Type: ${business.businessType || 'local business'}
- Location: ${business.address}
- Google Rating: ${business.rating ?? 'N/A'}★ (${business.reviewCount ?? 0} reviews)
- Instagram handle hint: ${business.suggestedInstagram || 'unknown'}
- Customer praise: ${praises}
- Available photos: ${photos}

Return ONLY valid JSON:
{
  "instagramHandle": "@handle",
  "facebookPresence": "one sentence about Facebook social proof",
  "tiktokMentionEstimate": "one sentence about TikTok/local buzz",
  "asSeenOnBadges": ["badge1", "badge2", "badge3"],
  "counters": [
    { "label": "Google Rating", "value": "4.8★" },
    { "label": "Reviews", "value": "200+" },
    { "label": "Instagram Followers", "value": "2.5K" }
  ],
  "wallPosts": [
    { "platform": "instagram", "caption": "short post caption", "engagement": "142 likes" }
  ],
  "photoCaptions": ["caption for photo 1", "caption for photo 2"]
}

Generate exactly 6 wallPosts (mix instagram, facebook, google). Captions should feel authentic and local.
photoCaptions: one per available photo (${photos} photos).`;
}

export async function buildSocialProofIntel(
  business: GooglePlacesBusiness
): Promise<SocialProofIntel> {
  const photos = business.photos ?? [];
  const groq = getGroqClient();
  if (!groq) return fallbackIntel(business);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON. No markdown.' },
        { role: 'user', content: buildSocialProofPrompt(business) },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1536,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const result = parseJsonContent<SocialProofAiResult>(raw);
    if (!result) return fallbackIntel(business);

    const handle = normalizeHandle(
      result.instagramHandle || business.suggestedInstagram,
      business.name
    );

    const wallPosts: SocialWallPost[] = (result.wallPosts ?? [])
      .slice(0, 6)
      .map((post, i) => {
        const platform =
          post.platform === 'facebook' || post.platform === 'tiktok' || post.platform === 'google'
            ? post.platform
            : 'instagram';
        return {
          platform,
          caption: post.caption || `Love ${business.name}!`,
          imageUrl: photos[i % Math.max(photos.length, 1)],
          engagement: post.engagement || `${80 + i * 20} likes`,
        };
      });

    if (wallPosts.length < 6 && photos.length) {
      for (let i = wallPosts.length; i < 6 && i < photos.length; i++) {
        wallPosts.push({
          platform: 'instagram',
          caption: business.topPraises?.[i % (business.topPraises?.length || 1)] ||
            `Amazing ${business.businessType || 'service'} at ${business.name}`,
          imageUrl: photos[i],
          engagement: `${100 + i * 30} likes`,
        });
      }
    }

    const captions = result.photoCaptions ?? [];
    const photoGallery = photos.map((url, i) => ({
      url,
      caption:
        captions[i] ||
        `${business.name} — ${business.businessType || 'local'} (${i + 1})`,
    }));

    const counters: SocialProofCounter[] = (result.counters ?? [])
      .filter((c) => c.label && c.value)
      .map((c) => ({ label: c.label!, value: c.value! }));

    if (counters.length === 0) {
      counters.push(
        { label: 'Google Rating', value: business.rating != null ? `${business.rating}★` : '4.8★' },
        {
          label: 'Reviews',
          value: business.reviewCount != null ? String(business.reviewCount) : '100+',
        }
      );
    }

    return {
      instagramHandle: result.instagramHandle?.startsWith('@')
        ? result.instagramHandle
        : `@${handle}`,
      instagramProfileUrl: `https://www.instagram.com/${handle}/`,
      facebookPresence:
        result.facebookPresence ||
        `Customers actively recommend ${business.name} on Facebook`,
      tiktokMentionEstimate:
        result.tiktokMentionEstimate || `Featured in local TikTok discovery`,
      asSeenOnBadges:
        Array.isArray(result.asSeenOnBadges) && result.asSeenOnBadges.length > 0
          ? result.asSeenOnBadges.slice(0, 5)
          : ['Google Reviews', 'Local Favorite'],
      counters,
      wallPosts,
      photoGallery,
      aggregated: true,
    };
  } catch (error) {
    console.error('Social proof error:', error);
    return fallbackIntel(business);
  }
}
