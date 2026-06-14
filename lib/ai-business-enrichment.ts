import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type { GooglePlacesBusiness, GooglePlacesReview } from '@/lib/google-places-types';

export type BusinessEnrichmentInput = GooglePlacesBusiness & {
  reviews?: GooglePlacesReview[];
};

export type EnrichedBusinessData = GooglePlacesBusiness & {
  reviews?: GooglePlacesReview[];
  predictedWebsite: string;
  predictedEmail: string;
  generatedDescription: string;
  seoKeywords: string[];
  suggestedInstagram: string;
  sentimentScore: number;
  topPraises: string[];
  topComplaints: string[];
  improvementSuggestions: string[];
  testimonialQuote: string;
  enriched: true;
};

type EnrichmentFields = {
  predictedWebsite?: string;
  predictedEmail?: string;
  generatedDescription?: string;
  seoKeywords?: string[];
  suggestedInstagram?: string;
};

type SentimentFields = {
  sentimentScore?: number;
  topPraises?: string[];
  topComplaints?: string[];
  improvementSuggestions?: string[];
  testimonialQuote?: string;
};

function slugHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

function fallbackEnrichment(business: BusinessEnrichmentInput): EnrichedBusinessData {
  const area = business.address.split(',')[0]?.trim() || 'the local area';
  const type = business.businessType || 'business';
  const handle = slugHandle(business.name);

  return {
    ...business,
    predictedWebsite: business.website || (handle ? `https://${handle}.co.uk` : ''),
    predictedEmail: handle ? `info@${handle}.co.uk` : '',
    generatedDescription: `Professional ${type} serving ${area}. Quality service with excellent customer satisfaction.`,
    seoKeywords: [type, business.name, 'local business', area, `${type} near me`].slice(0, 5),
    suggestedInstagram: handle ? `@${handle}` : `@${business.name.toLowerCase().replace(/[^a-z]/g, '')}`,
    sentimentScore: 70,
    topPraises: [],
    topComplaints: [],
    improvementSuggestions: [],
    testimonialQuote: `"Great service from ${business.name}!"`,
    enriched: true,
  };
}

const ENRICHMENT_SYSTEM = `You are an AI business intelligence expert. Return ONLY valid JSON. No markdown.`;

function buildEnrichmentPrompt(business: BusinessEnrichmentInput): string {
  return `Given this business data from Google Places:

Business Name: ${business.name}
Business Type: ${business.businessType || 'business'}
Address: ${business.address}
${business.rating != null ? `Rating: ${business.rating} stars from ${business.reviewCount ?? 0} reviews` : ''}
${business.openingHours?.length ? `Opening Hours: ${business.openingHours.join(', ')}` : ''}
${business.website ? `Website: ${business.website}` : 'No website found'}
${business.phone ? `Phone: ${business.phone}` : ''}

Predict and return JSON with:
- predictedWebsite: most likely website URL (businessname.co.uk or .com)
- predictedEmail: most likely email (info@, hello@, contact@, or bookings@)
- generatedDescription: professional 2-sentence hero description
- seoKeywords: array of exactly 5 SEO keywords
- suggestedInstagram: suggested handle like @businessname`;
}

function buildSentimentPrompt(business: BusinessEnrichmentInput): string {
  const reviewsText = (business.reviews ?? [])
    .slice(0, 10)
    .map((r) => `- "${r.text}" (${r.rating} stars)`)
    .join('\n');

  return `Analyze these Google reviews for ${business.name}:

${reviewsText}

Return JSON with:
- sentimentScore: overall sentiment 0-100
- topPraises: array of top 3 things customers praise
- topComplaints: array of top 3 complaints or concerns
- improvementSuggestions: array of 3 actionable improvements
- testimonialQuote: one cleaned customer testimonial sentence`;
}

export async function enrichBusinessData(
  business: BusinessEnrichmentInput
): Promise<EnrichedBusinessData> {
  const groq = getGroqClient();
  if (!groq) {
    return fallbackEnrichment(business);
  }

  try {
    const enrichmentCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: ENRICHMENT_SYSTEM },
        { role: 'user', content: buildEnrichmentPrompt(business) },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const enrichmentRaw = enrichmentCompletion.choices[0]?.message?.content || '{}';
    const enrichmentResult = parseJsonContent<EnrichmentFields>(enrichmentRaw) ?? {};

    let sentimentData: SentimentFields = {
      sentimentScore: 70,
      topPraises: [],
      topComplaints: [],
      improvementSuggestions: [],
      testimonialQuote: '',
    };

    if (business.reviews && business.reviews.length > 0) {
      const reviewCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: ENRICHMENT_SYSTEM },
          { role: 'user', content: buildSentimentPrompt(business) },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const reviewRaw = reviewCompletion.choices[0]?.message?.content || '{}';
      sentimentData = parseJsonContent<SentimentFields>(reviewRaw) ?? sentimentData;
    }

    const handle = slugHandle(business.name);
    const area = business.address.split(',')[0]?.trim() || 'the local community';
    const type = business.businessType || 'business';

    return {
      ...business,
      predictedWebsite:
        enrichmentResult.predictedWebsite || business.website || (handle ? `https://${handle}.co.uk` : ''),
      predictedEmail: enrichmentResult.predictedEmail || (handle ? `info@${handle}.co.uk` : ''),
      generatedDescription:
        enrichmentResult.generatedDescription ||
        `Professional ${type} serving ${area}. Quality service with excellent customer satisfaction.`,
      seoKeywords:
        Array.isArray(enrichmentResult.seoKeywords) && enrichmentResult.seoKeywords.length > 0
          ? enrichmentResult.seoKeywords.slice(0, 5)
          : [type, business.name, 'local business', area, `${type} near me`].slice(0, 5),
      suggestedInstagram:
        enrichmentResult.suggestedInstagram || (handle ? `@${handle}` : `@${business.name.toLowerCase().replace(/[^a-z]/g, '')}`),
      sentimentScore:
        typeof sentimentData.sentimentScore === 'number'
          ? Math.min(100, Math.max(0, Math.round(sentimentData.sentimentScore)))
          : 70,
      topPraises: Array.isArray(sentimentData.topPraises) ? sentimentData.topPraises.slice(0, 3) : [],
      topComplaints: Array.isArray(sentimentData.topComplaints)
        ? sentimentData.topComplaints.slice(0, 3)
        : [],
      improvementSuggestions: Array.isArray(sentimentData.improvementSuggestions)
        ? sentimentData.improvementSuggestions.slice(0, 3)
        : [],
      testimonialQuote:
        sentimentData.testimonialQuote || `"Great service! Highly recommend ${business.name}."`,
      enriched: true,
    };
  } catch (error) {
    console.error('Enrichment error:', error);
    return fallbackEnrichment(business);
  }
}
