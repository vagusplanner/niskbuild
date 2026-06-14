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
  name: string;
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
  rating?: number;
  reviewCount?: number;
  businessType?: string;
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
};

export type GooglePlacesProjectContext = {
  type: 'google_places';
  source: 'google_places_api';
  importedAt: string;
  business: GooglePlacesBusiness;
  raw?: Record<string, unknown>;
};
