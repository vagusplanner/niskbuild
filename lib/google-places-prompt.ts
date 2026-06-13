import type { GooglePlacesBusiness } from '@/lib/google-places-types';

export function buildGooglePlacesPrompt(business: GooglePlacesBusiness | null | undefined): string {
  if (!business?.name) return '';

  const hours =
    business.openingHours?.length ? business.openingHours.join('; ') : 'Not specified';

  return [
    '',
    'You are building an app for a real local business. Use ONLY the following verified Google Places data for all copy, contact sections, hours, and branding — do not invent alternate addresses or phone numbers.',
    `- Business name: ${business.name}`,
    `- Business type: ${business.businessType || 'local business'}`,
    `- Address: ${business.address}`,
    `- Phone: ${business.phone || 'Not listed'}`,
    `- Website: ${business.website || 'Not listed'}`,
    `- Opening hours: ${hours}`,
    `- Rating: ${business.rating ?? 'N/A'} stars from ${business.reviewCount ?? 0} reviews`,
    business.description
      ? `- Customer review summary: ${business.description.slice(0, 500)}`
      : '',
    '',
    `Pre-fill the generated app with ${business.name}'s real name, address, phone, website, and hours wherever relevant.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildGooglePlacesUserPrompt(business: GooglePlacesBusiness): string {
  return `Create a modern, mobile-responsive website for ${business.name}, a ${business.businessType || 'local business'} at ${business.address}.`;
}
