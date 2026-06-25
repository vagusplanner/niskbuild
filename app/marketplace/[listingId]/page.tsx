"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import { getSafeSession } from '@/lib/supabaseSession';
import { formatTemplatePrice } from '@/lib/marketplace-types';

type ListingDetail = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  price: number;
  author: string;
  category: string;
  listingType?: string;
  sourceLayer?: string;
  hostedUrl?: string | null;
  appStoreUrl?: string | null;
  owned?: boolean;
};

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3h7v7M10 14L21 3M21 10v11H3V3h11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.08 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function HostedIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M4 9h16M8 13h8M8 16h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function MarketplaceDetailContent() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.listing) {
          const found = d.listing;
          setListing({
            id: found.id,
            name: found.name,
            description: found.description,
            prompt: found.prompt,
            price: found.price,
            author: found.author,
            category: found.category,
            listingType: found.listingType,
            sourceLayer: found.sourceLayer,
            hostedUrl: found.hostedUrl ?? null,
            appStoreUrl: found.appStoreUrl ?? null,
            owned: found.owned,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listingId]);

  const handleClone = async () => {
    const session = await getSafeSession();
    if (!session?.user) {
      router.push(`/login?next=/marketplace/${listingId}`);
      return;
    }

    if (listing!.price > 0 && !listing!.owned) {
      router.push(`/marketplace?purchase=${listingId}`);
      return;
    }

    setCloning(true);
    setError(null);
    try {
      const res = await fetch('/api/marketplace/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Clone failed');
        return;
      }
      if (data.projectId) {
        localStorage.setItem('niskbuild_load_project_id', data.projectId);
      } else if (listing?.prompt) {
        localStorage.setItem('niskbuild_template_prompt', listing.prompt);
      }
      router.push('/builder');
    } catch {
      setError('Clone failed');
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return <p className="text-nisk-muted py-12 text-center">Loading…</p>;
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-nisk-muted mb-4">Listing not found.</p>
        <Link href="/marketplace" className="text-[var(--copper-melt)] hover:underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const isOriginal = listing.sourceLayer === 'firstparty';
  const showHostedLink =
    Boolean(listing.hostedUrl?.trim()) &&
    (listing.sourceLayer === 'firstparty' || listing.listingType === 'ready_made');
  const showAppStoreLink = Boolean(listing.appStoreUrl?.trim());

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/marketplace" className="text-sm text-nisk-muted hover:text-[var(--copper-melt)]">
        ← Marketplace
      </Link>
      <header className="mt-6 mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-nisk text-nisk-muted">
            {listing.category}
          </span>
          {isOriginal && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--copper-primary)]/15 text-[var(--copper-melt)] border border-[var(--copper-primary)]/25">
              Niskbuild original
            </span>
          )}
          {listing.hostedUrl?.trim() && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--copper-melt)] border border-[var(--success)]/30">
              Hosted
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-nisk text-nisk-muted">
            {listing.listingType ?? 'template'}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{listing.name}</h1>
        <p className="text-nisk-muted mt-2">Built and maintained by {listing.author}</p>
        <p className="text-xl font-semibold text-[var(--copper-melt)] mt-4">
          {formatTemplatePrice(listing.price)}
        </p>
      </header>

      <p className="text-nisk-muted leading-relaxed mb-8">{listing.description}</p>

      {error && (
        <p className="mb-4 text-sm text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleClone}
        disabled={cloning}
        className="btn-primary px-8 py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {cloning
          ? 'Cloning…'
          : listing.owned || listing.price === 0
            ? 'Clone to my projects →'
            : `Buy for $${listing.price}`}
      </button>

      {(showHostedLink || showAppStoreLink) && (
        <footer className="mt-10 pt-6 border-t border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted font-semibold mb-3">
            Also available
          </p>
          <div className="flex flex-wrap gap-3">
            {showHostedLink && listing.hostedUrl && (
              <a
                href={listing.hostedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--foreground)] hover:border-[var(--copper-primary)]/50 hover:text-[var(--copper-melt)] transition-colors"
              >
                <HostedIcon />
                Open hosted app
                <ExternalLinkIcon />
              </a>
            )}
            {showAppStoreLink && listing.appStoreUrl && (
              <a
                href={listing.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--foreground)] hover:border-[var(--copper-primary)]/50 hover:text-[var(--copper-melt)] transition-colors"
              >
                <AppStoreIcon />
                View on App Store
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

export default function MarketplaceDetailPage() {
  return (
    <Layout>
      <Suspense fallback={<p className="text-nisk-muted py-12 text-center">Loading…</p>}>
        <MarketplaceDetailContent />
      </Suspense>
    </Layout>
  );
}
