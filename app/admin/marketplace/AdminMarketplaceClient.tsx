"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  listing_type: string;
  seller_email: string;
  is_active: boolean;
  featured: boolean;
  created_at: string;
};

type Stats = {
  total: number;
  active: number;
  pending: number;
  featured: number;
  purchases: number;
  salesCentsThisMonth: number;
};

const FILTERS = [
  { value: 'all', label: 'All listings' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'featured', label: 'Featured' },
];

export default function AdminMarketplaceClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    featured: 0,
    purchases: 0,
    salesCentsThisMonth: 0,
  });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);

    const res = await fetch(`/api/admin/marketplace/listings?${params.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setListings(data.listings ?? []);
      setStats(
        data.stats ?? {
          total: 0,
          active: 0,
          pending: 0,
          featured: 0,
          purchases: 0,
          salesCentsThisMonth: 0,
        }
      );
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const runAction = async (id: string, action: 'approve' | 'reject' | 'feature' | 'unfeature') => {
    setUpdatingId(id);
    const res = await fetch(`/api/admin/marketplace/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setUpdatingId(null);
    if (res.ok) fetchListings();
  };

  return (
    <AdminPlatformShell
      title="🏪 Marketplace Listings"
      description="Approve, reject, and feature marketplace listings"
      stats={[
        { label: 'Total listings', value: stats.total },
        { label: 'Active', value: stats.active },
        { label: 'Pending', value: stats.pending },
        {
          label: 'Sales this month',
          value: `$${(stats.salesCentsThisMonth / 100).toFixed(2)}`,
          hint: `${stats.purchases} total purchases`,
        },
      ]}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-nisk-card border border-nisk rounded-lg px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Link href="/marketplace" className="px-4 py-2 rounded-lg border border-nisk text-sm">
          View public marketplace
        </Link>
        <button type="button" onClick={fetchListings} className="px-4 py-2 rounded-lg border border-nisk text-sm">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-nisk-muted py-12 text-center">Loading listings...</p>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-nisk-muted">
          <p className="mb-2">No listings match this filter.</p>
          <p className="text-sm">Seed listings in Supabase or approve pending submissions.</p>
        </div>
      ) : (
        <div className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left p-4 font-medium text-nisk-muted">Title</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Price</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Seller</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Status</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b border-nisk hover:bg-[var(--surface)]/50">
                    <td className="p-4">
                      <p className="font-medium text-[var(--foreground)]">{listing.title}</p>
                      <p className="text-xs text-nisk-muted mt-1 line-clamp-1">
                        {listing.description || listing.listing_type}
                      </p>
                      {listing.featured && (
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[var(--primary)]">${(listing.price_cents / 100).toFixed(2)}</td>
                    <td className="p-4 text-nisk-muted">{listing.seller_email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          listing.is_active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {listing.is_active ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {!listing.is_active && (
                          <button
                            type="button"
                            disabled={updatingId === listing.id}
                            onClick={() => runAction(listing.id, 'approve')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {listing.is_active && (
                          <button
                            type="button"
                            disabled={updatingId === listing.id}
                            onClick={() => runAction(listing.id, 'reject')}
                            className="px-3 py-1 rounded-lg bg-red-600/80 text-white text-xs disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        {!listing.featured ? (
                          <button
                            type="button"
                            disabled={updatingId === listing.id}
                            onClick={() => runAction(listing.id, 'feature')}
                            className="px-3 py-1 rounded-lg border border-nisk text-xs disabled:opacity-50"
                          >
                            Feature
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingId === listing.id}
                            onClick={() => runAction(listing.id, 'unfeature')}
                            className="px-3 py-1 rounded-lg border border-nisk text-xs disabled:opacity-50"
                          >
                            Unfeature
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPlatformShell>
  );
}
