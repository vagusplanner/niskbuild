export type GooglePlacesSearchResult = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  businessType?: string;
  vicinity?: string;
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
};

export type GooglePlacesProjectContext = {
  type: 'google_places';
  source: 'google_places_api';
  importedAt: string;
  business: GooglePlacesBusiness;
  raw?: Record<string, unknown>;
};
