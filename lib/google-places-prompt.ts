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
  if (business.sentimentScore != null) {
    lines.push(`- Review Sentiment Score: ${business.sentimentScore}/100`);
  }
  if (business.topPraises?.length) {
    lines.push(`- Customer Praise: ${business.topPraises.join(', ')}`);
  }
  if (business.topComplaints?.length) {
    lines.push(`- Customer Concerns: ${business.topComplaints.join(', ')}`);
  }
  if (business.improvementSuggestions?.length) {
    lines.push(`- Suggested Improvements: ${business.improvementSuggestions.join(', ')}`);
  }
  if (business.testimonialQuote) {
    lines.push(`- Customer Testimonial: "${business.testimonialQuote}"`);
  }
  if (business.photos?.length) {
    lines.push(`- Business Photos (use in hero/gallery): ${business.photos.join(', ')}`);
  }
  if (business.description) {
    lines.push(`- Review summary: ${business.description.slice(0, 500)}`);
  }

  if (business.competitorIntel?.analyzed) {
    const intel = business.competitorIntel;
    lines.push('', 'COMPETITOR INTELLIGENCE (Agency feature — include a comparison section):');
    lines.push(`- Unique Selling Point: ${intel.uniqueSellingPoint}`);
    lines.push(`- Why Choose Us: ${intel.whyChooseUs}`);
    if (intel.competitors.length) {
      lines.push('- Local Competitors:');
      intel.competitors.forEach((c, i) => {
        lines.push(
          `  ${i + 1}. ${c.name} — ${c.rating ?? 'N/A'}★ (${c.reviewCount ?? 0} reviews) — ${c.differentiator} — pricing: ${c.pricingTier}`
        );
      });
    }
    if (intel.comparisonTable.length) {
      lines.push('- Comparison Table (use on site):');
      intel.comparisonTable.forEach((row) => {
        lines.push(
          `  ${row.feature}: ${business.name} = ${row.client}; competitors = ${row.competitors.join(' | ')}`
        );
      });
    }
  }

  if (business.socialProof?.aggregated) {
    const sp = business.socialProof;
    lines.push('', 'SOCIAL PROOF WALL (Agency feature — include a visual Social Wall section):');
    lines.push(`- Instagram: ${sp.instagramHandle} (${sp.instagramProfileUrl})`);
    lines.push(`- Facebook: ${sp.facebookPresence}`);
    lines.push(`- TikTok: ${sp.tiktokMentionEstimate}`);
    if (sp.asSeenOnBadges.length) {
      lines.push(`- As Seen On badges: ${sp.asSeenOnBadges.join(', ')}`);
    }
    if (sp.counters.length) {
      lines.push('- Social proof counters (display prominently):');
      sp.counters.forEach((c) => lines.push(`  ${c.label}: ${c.value}`));
    }
    if (sp.wallPosts.length) {
      lines.push('- Social Wall posts (grid of 6 cards with image + caption + engagement):');
      sp.wallPosts.forEach((post, i) => {
        lines.push(
          `  ${i + 1}. [${post.platform}] ${post.caption}${post.imageUrl ? ` | image: ${post.imageUrl}` : ''}${post.engagement ? ` | ${post.engagement}` : ''}`
        );
      });
    }
    if (sp.photoGallery.length) {
      lines.push('- Customer photo gallery:');
      sp.photoGallery.forEach((p, i) => {
        lines.push(`  ${i + 1}. ${p.caption} — ${p.url}`);
      });
    }
  }

  const closingInstructions = [
    `Generate a complete website for ${business.name} using ALL this information.`,
    'Pre-fill all content with real data. Include a testimonial section with the provided testimonial when available.',
    'Address customer concerns subtly in copy where appropriate. Use business photos in hero or gallery sections.',
  ];

  if (business.competitorIntel?.analyzed) {
    closingInstructions.push(
      'Include a "Why Choose Us" section and a comparison table vs local competitors using the competitor intelligence above.'
    );
  }

  if (business.socialProof?.aggregated) {
    closingInstructions.push(
      'Include a "Social Wall" section with Instagram-style post grid, social proof counters, "As seen on" badges, and a customer photo gallery using the URLs provided.'
    );
  }

  closingInstructions.push('Optimize the page for the SEO keywords listed above.');
  lines.push('', ...closingInstructions);

  return lines.join('\n');
}

export function buildGooglePlacesUserPrompt(business: GooglePlacesBusiness): string {
  const desc = business.generatedDescription
    ? ` ${business.generatedDescription}`
    : '';
  return `Create a modern, mobile-responsive website for ${business.name}, a ${business.businessType || 'local business'} at ${business.address}.${desc}`;
}
