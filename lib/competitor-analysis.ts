import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type {
  CompetitorCandidate,
  CompetitorIntel,
  CompetitorSummary,
  GooglePlacesBusiness,
} from '@/lib/google-places-types';

type AnalysisResult = {
  competitors?: Array<{
    name?: string;
    differentiator?: string;
    pricingTier?: string;
  }>;
  comparisonTable?: Array<{
    feature?: string;
    client?: string;
    competitor1?: string;
    competitor2?: string;
    competitor3?: string;
  }>;
  whyChooseUs?: string;
  uniqueSellingPoint?: string;
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

function normalizePricingTier(value?: string): CompetitorSummary['pricingTier'] {
  const v = (value || '').toLowerCase();
  if (v.includes('budget') || v.includes('cheap') || v.includes('low')) return 'budget';
  if (v.includes('premium') || v.includes('high') || v.includes('luxury')) return 'premium';
  return 'mid';
}

function fallbackIntel(
  business: GooglePlacesBusiness,
  candidates: CompetitorCandidate[]
): CompetitorIntel {
  const competitors: CompetitorSummary[] = candidates.map((c) => ({
    name: c.name,
    address: c.address,
    rating: c.rating,
    reviewCount: c.reviewCount,
    differentiator: c.rating != null ? `${c.rating}★ local competitor` : 'Local competitor',
    pricingTier: 'mid',
  }));

  const clientRating = business.rating != null ? `${business.rating}★` : 'Strong local presence';
  const clientReviews =
    business.reviewCount != null ? `${business.reviewCount} reviews` : 'Trusted locally';

  return {
    competitors,
    comparisonTable: [
      {
        feature: 'Google Rating',
        client: clientRating,
        competitors: competitors.map((c) =>
          c.rating != null ? `${c.rating}★` : 'N/A'
        ),
      },
      {
        feature: 'Review Volume',
        client: clientReviews,
        competitors: competitors.map((c) =>
          c.reviewCount != null ? `${c.reviewCount} reviews` : 'N/A'
        ),
      },
      {
        feature: 'Local Focus',
        client: business.address,
        competitors: competitors.map((c) => c.address.split(',')[0] || c.address),
      },
    ],
    whyChooseUs: `${business.name} combines ${clientRating} customer satisfaction with dedicated local service in ${business.address.split(',')[0] || 'your area'}.`,
    uniqueSellingPoint:
      business.topPraises?.[0] ||
      `Trusted ${business.businessType || 'local business'} with proven customer satisfaction.`,
    analyzed: true,
  };
}

function buildAnalysisPrompt(
  business: GooglePlacesBusiness,
  candidates: CompetitorCandidate[]
): string {
  const competitorLines = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} — ${c.address} — ${c.rating ?? 'N/A'}★ (${c.reviewCount ?? 0} reviews) — type: ${c.businessType || 'unknown'}`
    )
    .join('\n');

  return `You are a competitive intelligence analyst.

CLIENT BUSINESS:
- Name: ${business.name}
- Type: ${business.businessType || 'local business'}
- Location: ${business.address}
- Rating: ${business.rating ?? 'N/A'}★ (${business.reviewCount ?? 0} reviews)
${business.topPraises?.length ? `- Customer praise: ${business.topPraises.join('; ')}` : ''}
${business.topComplaints?.length ? `- Customer concerns: ${business.topComplaints.join('; ')}` : ''}

COMPETITORS (same area, same category):
${competitorLines}

Return ONLY valid JSON:
{
  "competitors": [
    { "name": "...", "differentiator": "one sentence", "pricingTier": "budget|mid|premium" }
  ],
  "comparisonTable": [
    { "feature": "Rating", "client": "...", "competitor1": "...", "competitor2": "...", "competitor3": "..." },
    { "feature": "Review Volume", "client": "...", "competitor1": "...", "competitor2": "...", "competitor3": "..." },
    { "feature": "Key Strength", "client": "...", "competitor1": "...", "competitor2": "...", "competitor3": "..." }
  ],
  "whyChooseUs": "2 sentences for website copy explaining why to choose the client",
  "uniqueSellingPoint": "one sentence USP for the client"
}`;
}

export async function analyzeCompetitors(
  business: GooglePlacesBusiness,
  candidates: CompetitorCandidate[]
): Promise<CompetitorIntel | null> {
  if (candidates.length === 0) return null;

  const groq = getGroqClient();
  if (!groq) return fallbackIntel(business, candidates);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON. No markdown.' },
        { role: 'user', content: buildAnalysisPrompt(business, candidates) },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1536,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const result = parseJsonContent<AnalysisResult>(raw);
    if (!result) return fallbackIntel(business, candidates);

    const aiCompetitors = Array.isArray(result.competitors) ? result.competitors : [];

    const competitors: CompetitorSummary[] = candidates.map((c, i) => {
      const ai = aiCompetitors[i] || aiCompetitors.find((a) => a.name === c.name);
      return {
        name: c.name,
        address: c.address,
        rating: c.rating,
        reviewCount: c.reviewCount,
        differentiator: ai?.differentiator || `${c.rating ?? 'N/A'}★ local competitor`,
        pricingTier: normalizePricingTier(ai?.pricingTier),
      };
    });

    const comparisonTable = (result.comparisonTable || []).map((row) => ({
      feature: row.feature || 'Feature',
      client: row.client || '',
      competitors: [row.competitor1, row.competitor2, row.competitor3]
        .map((v) => v || 'N/A')
        .slice(0, competitors.length),
    }));

    return {
      competitors,
      comparisonTable:
        comparisonTable.length > 0
          ? comparisonTable
          : fallbackIntel(business, candidates).comparisonTable,
      whyChooseUs:
        result.whyChooseUs ||
        fallbackIntel(business, candidates).whyChooseUs,
      uniqueSellingPoint:
        result.uniqueSellingPoint ||
        fallbackIntel(business, candidates).uniqueSellingPoint,
      analyzed: true,
    };
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return fallbackIntel(business, candidates);
  }
}
