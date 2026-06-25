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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    price_dollars: '9',
    category: 'productivity',
    prompt: '',
  });
  const [exportJobs, setExportJobs] = useState<
    { id: string; status: string; requester_email: string; fee_cents: number; created_at: string }[]
  >([]);

  const fetchExportJobs = useCallback(async () => {
    const res = await fetch('/api/admin/marketplace/export-jobs');
    const data = await res.json();
    if (res.ok) setExportJobs(data.jobs ?? []);
  }, []);

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
    fetchExportJobs();
  }, [fetchListings, fetchExportJobs]);

  const createListing = async () => {
    setCreating(true);
    const priceCents = Math.round(parseFloat(createForm.price_dollars) * 100);
    const res = await fetch('/api/admin/marketplace/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: createForm.title,
        description: createForm.description,
        price_cents: priceCents,
        category: createForm.category,
        prompt: createForm.prompt,
      }),
    });
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setCreateForm({ title: '', description: '', price_dollars: '9', category: 'productivity', prompt: '' });
      fetchListings();
    }
  };

  const updateExportJob = async (id: string, status: string) => {
    await fetch('/api/admin/marketplace/export-jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchExportJobs();
  };

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
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 rounded-lg btn-primary text-sm"
        >
          + New listing
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 p-5 rounded-xl border border-nisk bg-nisk-card grid md:grid-cols-2 gap-4">
          <input
            placeholder="Title"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            className="bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Price (USD)"
            value={createForm.price_dollars}
            onChange={(e) => setCreateForm((f) => ({ ...f, price_dollars: e.target.value }))}
            className="bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Category"
            value={createForm.category}
            onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
            className="bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            className="md:col-span-2 bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm min-h-[60px]"
          />
          <textarea
            placeholder="Builder prompt (loaded when purchased)"
            value={createForm.prompt}
            onChange={(e) => setCreateForm((f) => ({ ...f, prompt: e.target.value }))}
            className="md:col-span-2 bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm min-h-[80px]"
          />
          <button
            type="button"
            disabled={creating || !createForm.title.trim()}
            onClick={createListing}
            className="md:col-span-2 btn-primary py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Publish listing'}
          </button>
        </div>
      )}

      {exportJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Export job queue</h2>
          <div className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left p-3 text-nisk-muted">Requester</th>
                  <th className="text-left p-3 text-nisk-muted">Status</th>
                  <th className="text-left p-3 text-nisk-muted">Fee</th>
                  <th className="text-left p-3 text-nisk-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((job) => (
                  <tr key={job.id} className="border-b border-nisk">
                    <td className="p-3">{job.requester_email}</td>
                    <td className="p-3 capitalize">{job.status.replace('_', ' ')}</td>
                    <td className="p-3">${(job.fee_cents / 100).toFixed(2)}</td>
                    <td className="p-3 flex gap-2">
                      {job.status === 'requested' && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateExportJob(job.id, 'approved')}
                            className="px-2 py-1 text-xs rounded bg-[var(--copper-primary)]/20 text-[var(--copper-melt)]"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateExportJob(job.id, 'rejected')}
                            className="px-2 py-1 text-xs rounded border border-nisk"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {job.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => updateExportJob(job.id, 'completed')}
                          className="px-2 py-1 text-xs rounded bg-[var(--copper-primary)]/20"
                        >
                          Mark complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
