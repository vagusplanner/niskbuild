"use client";

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
  GooglePlacesSearchResult,
} from '@/lib/google-places-types';

type GooglePlacesImportProps = {
  canImport: boolean;
  onImport: (business: GooglePlacesBusiness, context: GooglePlacesProjectContext) => void;
};

export default function GooglePlacesImport({ canImport, onImport }: GooglePlacesImportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlacesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<GooglePlacesBusiness | null>(null);
  const [pendingContext, setPendingContext] = useState<GooglePlacesProjectContext | null>(null);
  const [showModal, setShowModal] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchBusinesses = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/import/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'search', query }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.upgrade) {
          setError('Pro plan required for Google Places import.');
          return;
        }
        setError(data.error || 'Search failed');
        setSearchResults([]);
        return;
      }

      setSearchResults(data.places || []);
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedBusiness(null);
    setPendingContext(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (value.length >= 3) searchBusinesses(value);
      else setSearchResults([]);
    }, 400);
  };

  const fetchBusinessDetails = async (placeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/import/google-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'details', placeId }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.upgrade) {
          setError('Pro plan required for Google Places import.');
          return;
        }
        setError(data.error || 'Could not load business details');
        return;
      }

      if (data.business) {
        setSelectedBusiness(data.business);
        setPendingContext(data.projectContext || null);
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!selectedBusiness || !pendingContext) return;
    onImport(selectedBusiness, pendingContext);
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBusiness(null);
    setPendingContext(null);
    setError(null);
  };

  const openModal = () => {
    if (!canImport) {
      const go = confirm(
        'Google Places import requires an active Pro plan or above.\n\nOpen Pricing?'
      );
      if (go) window.location.href = '/pricing';
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <div className="shrink-0 px-0 pb-0">
        <p className="text-[10px] text-nisk-muted mb-2">
          Building for a local business? Import their info automatically.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-gradient-brand text-white hover:opacity-90"
        >
          <span>📍</span>
          Import Business from Google
        </button>
        <p className="text-[10px] text-nisk-muted text-center mt-1.5">
          <Link href="/docs/google-import" className="text-[var(--accent-cyan)] hover:underline">
            How it works
          </Link>
          {!canImport && (
            <span className="text-nisk-muted"> · Pro plan required</span>
          )}
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-nisk bg-nisk-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-nisk flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Import from Google</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-nisk-muted hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-nisk-muted mb-3">
                Search for your client&apos;s business name and city.
              </p>

              <input
                type="text"
                placeholder="e.g. Pizza Roma London"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 bg-nisk border border-nisk rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]"
                autoFocus
              />

              {error && (
                <p className="text-xs text-[var(--error)] mt-2">{error}</p>
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loading && searchResults.length > 0 && !selectedBusiness && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => fetchBusinessDetails(place.placeId)}
                      className="w-full p-3 rounded-xl border border-nisk bg-nisk-surface text-left hover:border-[var(--accent-cyan)]/50 transition-colors"
                    >
                      <p className="font-medium text-white text-sm">{place.name}</p>
                      <p className="text-xs text-nisk-muted mt-0.5">{place.address}</p>
                      {place.rating != null && (
                        <p className="text-[10px] text-yellow-400/90 mt-1">
                          ★ {place.rating.toFixed(1)}
                          {place.userRatingsTotal != null && ` (${place.userRatingsTotal} reviews)`}
                          {place.businessType && ` · ${place.businessType}`}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedBusiness && (
                <div className="mt-4 p-4 rounded-xl border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5">
                  <h3 className="font-semibold text-white">{selectedBusiness.name}</h3>
                  <p className="text-xs text-nisk-muted mt-1">{selectedBusiness.address}</p>
                  {selectedBusiness.phone && (
                    <p className="text-xs text-gray-300 mt-1">{selectedBusiness.phone}</p>
                  )}
                  {selectedBusiness.website && (
                    <p className="text-xs text-[var(--accent-cyan)] truncate mt-1">
                      {selectedBusiness.website}
                    </p>
                  )}
                  {selectedBusiness.rating != null && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ★ {selectedBusiness.rating} ({selectedBusiness.reviewCount ?? 0} reviews)
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-nisk text-sm text-nisk-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!selectedBusiness || !pendingContext}
                  className="flex-1 py-2 rounded-lg btn-primary text-sm font-medium disabled:opacity-40"
                >
                  Use this business
                </button>
              </div>

              <p className="text-[10px] text-nisk-muted text-center mt-4">
                Powered by Google Places API · ~$0.017 per search
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
