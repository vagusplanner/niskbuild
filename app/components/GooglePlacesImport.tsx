"use client";

import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
  GooglePlacesSearchResult,
} from '@/lib/google-places-types';

export type GooglePlacesImportHandle = {
  open: () => void;
};

type GooglePlacesImportProps = {
  canImport: boolean;
  canUseCompetitorIntel?: boolean;
  canUseSocialProof?: boolean;
  onImport: (business: GooglePlacesBusiness, context: GooglePlacesProjectContext) => void;
};

const GooglePlacesImport = forwardRef<GooglePlacesImportHandle, GooglePlacesImportProps>(
  function GooglePlacesImport(
    {
      canImport,
      canUseCompetitorIntel = false,
      canUseSocialProof = false,
      onImport,
    },
    ref
  ) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlacesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<GooglePlacesBusiness | null>(null);
  const [pendingContext, setPendingContext] = useState<GooglePlacesProjectContext | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEnrichment, setShowEnrichment] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showSocialProof, setShowSocialProof] = useState(false);
  const [wasEnriched, setWasEnriched] = useState(false);
  const [hasCompetitorIntel, setHasCompetitorIntel] = useState(false);
  const [hasSocialProof, setHasSocialProof] = useState(false);
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

  const fetchBusinessDetails = useCallback(
    async (placeId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/import/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'details',
            placeId,
            enrich: showEnrichment,
            competitors: showCompetitors && canUseCompetitorIntel,
            socialProof: showSocialProof && canUseSocialProof,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403 && data.upgrade) {
            if (data.upgradeTier === 'agency') {
              setError('Competitor comparison requires Agency plan or above.');
            } else {
              setError('Pro plan required for Google Places import.');
            }
            return;
          }
          setError(data.error || 'Could not load business details');
          return;
        }

        if (data.business) {
          setSelectedBusiness(data.business);
          setPendingContext(data.projectContext || null);
          setWasEnriched(!!data.enriched);
          setHasCompetitorIntel(!!data.competitorIntel || !!data.business.competitorIntel);
          setHasSocialProof(!!data.socialProof || !!data.business.socialProof);
        }
      } catch {
        setError('Network error — try again');
      } finally {
        setLoading(false);
      }
    },
    [showEnrichment, showCompetitors, showSocialProof, canUseCompetitorIntel, canUseSocialProof]
  );

  const handleImport = () => {
    if (!selectedBusiness || !pendingContext) return;
    onImport(selectedBusiness, pendingContext);
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedBusiness(null);
    setPendingContext(null);
    setWasEnriched(false);
    setHasCompetitorIntel(false);
    setHasSocialProof(false);
    setError(null);
  };

  const openModal = useCallback(() => {
    if (!canImport) {
      const go = confirm(
        'Google Places import requires an active Pro plan or above.\n\nOpen Pricing?'
      );
      if (go) window.location.href = '/pricing';
      return;
    }
    setShowModal(true);
  }, [canImport]);

  useImperativeHandle(ref, () => ({ open: openModal }), [openModal]);

  return (
    <>
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

              <div className="flex items-center justify-between mb-3 p-3 rounded-xl border border-nisk bg-nisk-surface">
                <div>
                  <p className="text-sm text-white font-medium">AI Enrichment</p>
                  <p className="text-[10px] text-nisk-muted">Predict website, SEO keywords & review insights</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnrichment((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showEnrichment
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-nisk border border-nisk text-nisk-muted'
                  }`}
                >
                  {showEnrichment ? '✓ Enrichment ON' : 'Enrichment OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between mb-4 p-3 rounded-xl border border-nisk bg-nisk-surface">
                <div>
                  <p className="text-sm text-white font-medium">Competitor Intel</p>
                  <p className="text-[10px] text-nisk-muted">
                    {canUseCompetitorIntel
                      ? 'Find top 3 local rivals + comparison table'
                      : 'Agency plan required'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!canUseCompetitorIntel) {
                      const go = confirm(
                        'Competitor comparison requires Agency plan or above.\n\nOpen Pricing?'
                      );
                      if (go) window.location.href = '/pricing';
                      return;
                    }
                    setShowCompetitors((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showCompetitors && canUseCompetitorIntel
                      ? 'bg-orange-600 text-white'
                      : 'bg-nisk border border-nisk text-nisk-muted'
                  }`}
                >
                  {showCompetitors && canUseCompetitorIntel ? '✓ Competitors ON' : 'Competitors OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between mb-4 p-3 rounded-xl border border-nisk bg-nisk-surface">
                <div>
                  <p className="text-sm text-white font-medium">Social Proof Wall</p>
                  <p className="text-[10px] text-nisk-muted">
                    {canUseSocialProof
                      ? 'Instagram-style feed, counters & photo gallery'
                      : 'Agency plan required'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!canUseSocialProof) {
                      const go = confirm(
                        'Social proof aggregator requires Agency plan or above.\n\nOpen Pricing?'
                      );
                      if (go) window.location.href = '/pricing';
                      return;
                    }
                    setShowSocialProof((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showSocialProof && canUseSocialProof
                      ? 'bg-pink-600 text-white'
                      : 'bg-nisk border border-nisk text-nisk-muted'
                  }`}
                >
                  {showSocialProof && canUseSocialProof ? '✓ Social ON' : 'Social OFF'}
                </button>
              </div>

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
                <div className="mt-4 space-y-3">
                  <div className="p-4 rounded-xl border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5">
                    <h3 className="font-semibold text-white text-sm mb-2">📋 Business Info</h3>
                    <p className="text-sm text-white">{selectedBusiness.name}</p>
                    <p className="text-xs text-nisk-muted mt-1">{selectedBusiness.address}</p>
                    {selectedBusiness.phone && (
                      <p className="text-xs text-gray-300 mt-1">{selectedBusiness.phone}</p>
                    )}
                    {(selectedBusiness.website || selectedBusiness.predictedWebsite) && (
                      <p className="text-xs text-[var(--accent-cyan)] truncate mt-1">
                        {selectedBusiness.website || selectedBusiness.predictedWebsite}
                      </p>
                    )}
                    {selectedBusiness.rating != null && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ★ {selectedBusiness.rating} ({selectedBusiness.reviewCount ?? 0} reviews)
                      </p>
                    )}
                  </div>

                  {wasEnriched && selectedBusiness.enriched && (
                    <>
                      <div className="p-4 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10">
                        <h3 className="font-semibold text-[var(--primary)] text-sm mb-2">
                          🔮 AI Enriched Data
                        </h3>
                        {selectedBusiness.predictedWebsite && (
                          <p className="text-xs text-gray-300">
                            <span className="text-nisk-muted">Predicted Website:</span>{' '}
                            {selectedBusiness.predictedWebsite}
                          </p>
                        )}
                        {selectedBusiness.predictedEmail && (
                          <p className="text-xs text-gray-300 mt-1">
                            <span className="text-nisk-muted">Predicted Email:</span>{' '}
                            {selectedBusiness.predictedEmail}
                          </p>
                        )}
                        {selectedBusiness.suggestedInstagram && (
                          <p className="text-xs text-gray-300 mt-1">
                            <span className="text-nisk-muted">Instagram:</span>{' '}
                            {selectedBusiness.suggestedInstagram}
                          </p>
                        )}
                        {selectedBusiness.generatedDescription && (
                          <p className="text-xs text-nisk-muted mt-2 italic">
                            &ldquo;{selectedBusiness.generatedDescription}&rdquo;
                          </p>
                        )}
                      </div>

                      {selectedBusiness.seoKeywords && selectedBusiness.seoKeywords.length > 0 && (
                        <div className="p-4 rounded-xl border border-nisk bg-nisk-surface">
                          <h3 className="font-semibold text-white text-sm mb-2">📊 SEO Keywords</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedBusiness.seoKeywords.map((kw) => (
                              <span
                                key={kw}
                                className="px-2 py-1 rounded-lg text-xs border border-nisk bg-nisk text-[var(--accent-cyan)]"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedBusiness.sentimentScore != null && (
                        <div className="p-4 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10">
                          <h3 className="font-semibold text-[var(--success)] text-sm mb-2">
                            ⭐ Review Intelligence
                          </h3>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-2xl font-bold text-white">
                              {selectedBusiness.sentimentScore}%
                            </div>
                            <div className="text-[10px] text-nisk-muted">Sentiment Score</div>
                          </div>
                          {selectedBusiness.topPraises && selectedBusiness.topPraises.length > 0 && (
                            <div className="mb-2">
                              <p className="text-[10px] text-emerald-400 font-medium">👍 What customers praise</p>
                              <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                                {selectedBusiness.topPraises.map((p) => (
                                  <li key={p}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {selectedBusiness.topComplaints &&
                            selectedBusiness.topComplaints.length > 0 && (
                              <div className="mb-2">
                                <p className="text-[10px] text-yellow-400 font-medium">
                                  ⚠️ What customers mention
                                </p>
                                <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                                  {selectedBusiness.topComplaints.map((c) => (
                                    <li key={c}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {selectedBusiness.testimonialQuote && (
                            <p className="text-xs text-nisk-muted mt-2 italic">
                              &ldquo;{selectedBusiness.testimonialQuote}&rdquo;
                            </p>
                          )}
                          {selectedBusiness.improvementSuggestions &&
                            selectedBusiness.improvementSuggestions.length > 0 && (
                              <div className="mt-3">
                                <p className="text-[10px] text-[var(--primary)] font-medium">
                                  💡 Suggested improvements
                                </p>
                                <ul className="text-xs text-gray-300 ml-4 mt-1 list-disc">
                                  {selectedBusiness.improvementSuggestions.map((s) => (
                                    <li key={s}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}

                      {selectedBusiness.photos && selectedBusiness.photos.length > 0 && (
                        <div className="p-4 rounded-xl border border-nisk bg-nisk-surface">
                          <h3 className="font-semibold text-white text-sm mb-2">📷 Business Photos</h3>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedBusiness.photos.map((src) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={src}
                                src={src}
                                alt={selectedBusiness.name}
                                className="w-full h-16 object-cover rounded-lg border border-nisk"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {hasCompetitorIntel && selectedBusiness.competitorIntel && (
                    <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10">
                      <h3 className="font-semibold text-orange-300 text-sm mb-2">
                        🏆 Competitor Intel
                      </h3>
                      <p className="text-xs text-gray-300 mb-2">
                        <span className="text-nisk-muted">USP:</span>{' '}
                        {selectedBusiness.competitorIntel.uniqueSellingPoint}
                      </p>
                      <p className="text-xs text-nisk-muted italic mb-3">
                        {selectedBusiness.competitorIntel.whyChooseUs}
                      </p>
                      {selectedBusiness.competitorIntel.competitors.map((c) => (
                        <div
                          key={c.name}
                          className="text-xs text-gray-300 py-1.5 border-t border-orange-500/20 first:border-0"
                        >
                          <span className="text-white font-medium">{c.name}</span>
                          {c.rating != null && (
                            <span className="text-yellow-400 ml-2">★ {c.rating}</span>
                          )}
                          <span className="text-nisk-muted ml-2 capitalize">({c.pricingTier})</span>
                          <p className="text-[10px] text-nisk-muted mt-0.5">{c.differentiator}</p>
                        </div>
                      ))}
                      {selectedBusiness.competitorIntel.comparisonTable.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="text-nisk-muted">
                                <th className="text-left py-1 pr-2">Feature</th>
                                <th className="text-left py-1 pr-2">Client</th>
                                {selectedBusiness.competitorIntel.competitors.map((c) => (
                                  <th key={c.name} className="text-left py-1 pr-2 truncate max-w-[72px]">
                                    {c.name.split(' ')[0]}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedBusiness.competitorIntel.comparisonTable.map((row) => (
                                <tr key={row.feature} className="border-t border-orange-500/10">
                                  <td className="py-1 pr-2 text-nisk-muted">{row.feature}</td>
                                  <td className="py-1 pr-2 text-white">{row.client}</td>
                                  {row.competitors.map((val, i) => (
                                    <td key={`${row.feature}-${i}`} className="py-1 pr-2 text-gray-300">
                                      {val}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {hasSocialProof && selectedBusiness.socialProof && (
                    <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-500/10">
                      <h3 className="font-semibold text-pink-300 text-sm mb-2">
                        📱 Social Proof Wall
                      </h3>
                      <p className="text-xs text-gray-300 mb-2">
                        <span className="text-nisk-muted">Instagram:</span>{' '}
                        <a
                          href={selectedBusiness.socialProof.instagramProfileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-300 hover:underline"
                        >
                          {selectedBusiness.socialProof.instagramHandle}
                        </a>
                      </p>
                      <p className="text-[10px] text-nisk-muted mb-2">
                        {selectedBusiness.socialProof.facebookPresence}
                      </p>
                      <p className="text-[10px] text-nisk-muted mb-3">
                        {selectedBusiness.socialProof.tiktokMentionEstimate}
                      </p>
                      {selectedBusiness.socialProof.counters.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedBusiness.socialProof.counters.map((c) => (
                            <span
                              key={c.label}
                              className="px-2 py-1 rounded-lg text-[10px] border border-pink-500/30 bg-pink-500/5 text-white"
                            >
                              {c.label}: <strong>{c.value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedBusiness.socialProof.asSeenOnBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {selectedBusiness.socialProof.asSeenOnBadges.map((badge) => (
                            <span
                              key={badge}
                              className="px-2 py-0.5 rounded-full text-[10px] bg-nisk text-nisk-muted border border-nisk"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedBusiness.socialProof.wallPosts.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {selectedBusiness.socialProof.wallPosts.slice(0, 6).map((post, i) => (
                            <div
                              key={`${post.caption}-${i}`}
                              className="rounded-lg border border-pink-500/20 overflow-hidden bg-nisk-surface"
                            >
                              {post.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={post.imageUrl}
                                  alt=""
                                  className="w-full h-12 object-cover"
                                />
                              )}
                              <p className="text-[9px] text-gray-300 p-1.5 line-clamp-2">
                                {post.caption}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
});

export default GooglePlacesImport;
