import type { GooglePlacesBusiness } from '@/lib/google-places-types';

export function buildGooglePlacesPrompt(business: GooglePlacesBusiness | null | undefined): string {
  if (!business?.name) return '';

  const hours =
    business.openingHours?.length ? business.openingHours.join('; ') : 'Not specified';
  const website = business.website || business.predictedWebsite || 'Not listed';

  const lines = [
    '',
    'BUSINESS CONTEXT (from Google Places + AI Enrichment):',
    'Use ONLY the following verified and enriched data for all copy, contact sections, hours, SEO, and branding.',
    `- Business Name: ${business.name}`,
    `- Type: ${business.businessType || 'local business'}`,
    `- Address: ${business.address}`,
    `- Phone: ${business.phone || 'Not available'}`,
    `- Website: ${website}`,
    `- Opening Hours: ${hours}`,
    `- Rating: ${business.rating ?? 'N/A'} stars from ${business.reviewCount ?? 0} reviews`,
  ];

  if (business.generatedDescription) {
    lines.push(`- AI-Generated Business Description: ${business.generatedDescription}`);
  }
  if (business.predictedEmail) {
    lines.push(`- Contact Email: ${business.predictedEmail}`);
  }
  if (business.suggestedInstagram) {
    lines.push(`- Instagram: ${business.suggestedInstagram}`);
  }
  if (business.seoKeywords?.length) {
    lines.push(`- SEO Keywords to target: ${business.seoKeywords.join(', ')}`);
  }
  if (business.topPraises?.length) {
    lines.push(`- Customer Praise: ${business.topPraises.join(', ')}`);
  }
  if (business.testimonialQuote) {
    lines.push(`- Customer Testimonial: "${business.testimonialQuote}"`);
  }
  if (business.description) {
    lines.push(`- Review summary: ${business.description.slice(0, 500)}`);
  }

  lines.push(
    '',
    `Generate a complete website for ${business.name} using ALL this information.`,
    'Pre-fill all content with real data. Include a testimonial section with the provided testimonial when available.',
    'Optimize the page for the SEO keywords listed above.'
  );

  return lines.join('\n');
}

export function buildGooglePlacesUserPrompt(business: GooglePlacesBusiness): string {
  const desc = business.generatedDescription
    ? ` ${business.generatedDescription}`
    : '';
  return `Create a modern, mobile-responsive website for ${business.name}, a ${business.businessType || 'local business'} at ${business.address}.${desc}`;
}
