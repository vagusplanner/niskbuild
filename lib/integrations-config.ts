export type IntegrationTier = 'free' | 'pro' | 'agency';
export type IntegrationStatus = 'available' | 'coming_soon';

export type IntegrationDefinition = {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: IntegrationStatus;
  tier: IntegrationTier;
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Add payments, subscriptions, and checkout',
    status: 'available',
    tier: 'pro',
  },
  {
    id: 'clerk',
    name: 'Clerk',
    icon: '🔐',
    description: 'Authentication and user management',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    icon: '📱',
    description: 'SMS and WhatsApp messaging',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'mapbox',
    name: 'Mapbox',
    icon: '🗺️',
    description: 'Interactive maps and location',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🎙️',
    description: 'Text-to-speech and voice',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'resend',
    name: 'Resend',
    icon: '📧',
    description: 'Email sending and transactional',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    icon: '📅',
    description: 'Booking and scheduling',
    status: 'coming_soon',
    tier: 'agency',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '📊',
    description: 'Database and spreadsheet',
    status: 'coming_soon',
    tier: 'agency',
  },
];

export const STRIPE_INJECT_CREDIT_COST = 2;
