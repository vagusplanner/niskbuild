export type CompetitorPricingTier = 'budget' | 'mid' | 'premium';

export type CompetitorCandidate = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  businessType?: string;
};

export type CompetitorSummary = {
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
  differentiator: string;
  pricingTier: CompetitorPricingTier;
};

export type CompetitorComparisonRow = {
  feature: string;
  client: string;
  competitors: string[];
};

export type CompetitorIntel = {
  competitors: CompetitorSummary[];
  comparisonTable: CompetitorComparisonRow[];
  whyChooseUs: string;
  uniqueSellingPoint: string;
  analyzed: true;
};

export type SocialWallPost = {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'google';
  caption: string;
  imageUrl?: string;
  engagement?: string;
};

export type SocialProofCounter = {
  label: string;
  value: string;
};

export type SocialProofIntel = {
  instagramHandle: string;
  instagramProfileUrl: string;
  facebookPresence: string;
  tiktokMentionEstimate: string;
  asSeenOnBadges: string[];
  counters: SocialProofCounter[];
  wallPosts: SocialWallPost[];
  photoGallery: Array<{ url: string; caption: string }>;
  aggregated: true;
};

export type GooglePlacesSearchResult = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  businessType?: string;
  vicinity?: string;
};

export type GooglePlacesReview = {
  text: string;
  rating: number;
  time: string;
};

export type GooglePlacesBusiness = {
  placeId?: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
  rating?: number;
  reviewCount?: number;
  businessType?: string;
  /** Resolved photo URLs (proxied, safe for client + generated sites) */
  photos?: string[];
  description?: string;
  googleMapsUrl?: string;
  reviews?: GooglePlacesReview[];
  /** AI enrichment fields (present when enrich=true on import) */
  predictedWebsite?: string;
  predictedEmail?: string;
  generatedDescription?: string;
  seoKeywords?: string[];
  suggestedInstagram?: string;
  sentimentScore?: number;
  topPraises?: string[];
  topComplaints?: string[];
  improvementSuggestions?: string[];
  testimonialQuote?: string;
  enriched?: boolean;
  /** Agency+ competitor intelligence */
  competitorIntel?: CompetitorIntel;
  /** Agency+ social proof aggregator */
  socialProof?: SocialProofIntel;
};

export type GooglePlacesProjectContext = {
  type: 'google_places';
  source: 'google_places_api';
  importedAt: string;
  business: GooglePlacesBusiness;
  raw?: Record<string, unknown>;
};
