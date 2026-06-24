import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ALL_MARKETPLACE_TEMPLATES,
  canAccessTemplate,
  getTemplateById,
  type MarketplaceTemplate,
} from '@/lib/marketplace-templates';

export type MarketplaceListingRow = {
  id: string;
  app_source: Record<string, unknown>;
  title: string;
  description: string | null;
  price_cents: number;
  listing_type: 'template' | 'ready_made' | 'commission';
  seller_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplacePurchaseRow = {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  stripe_payment_id: string | null;
  cloned_project_id: string | null;
  purchased_at: string;
};

export type MarketplaceListingItem = MarketplaceTemplate & {
  owned?: boolean;
  listingType?: MarketplaceListingRow['listing_type'];
  source: 'database' | 'memory';
};

export type MarketplacePurchaseItem = {
  id: string;
  purchasedAt: string;
  stripePaymentId: string | null;
  listing: MarketplaceListingItem;
  source: 'database' | 'memory';
};

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function legacyTemplateIdFromAppSource(appSource: Record<string, unknown>): string | null {
  const id = appSource.legacyTemplateId ?? appSource.templateId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export function listingRowToTemplate(row: MarketplaceListingRow): MarketplaceListingItem {
  const appSource = row.app_source ?? {};
  const legacyId = legacyTemplateIdFromAppSource(appSource);
  const complexity = Math.min(10, Math.max(1, asNumber(appSource.complexity, 5))) as MarketplaceTemplate['complexity'];

  return {
    id: row.id,
    name: row.title,
    description: row.description ?? '',
    prompt: asString(appSource.prompt),
    price: Math.round(row.price_cents / 100),
    complexity,
    downloads: asNumber(appSource.downloads, 0),
    author: asString(appSource.author, 'NiskBuild'),
    category: asString(appSource.category, 'productivity'),
    featured: appSource.featured === true,
    createdAt: row.created_at.slice(0, 10),
    listingType: row.listing_type,
    source: 'database',
    ...(legacyId ? { legacyTemplateId: legacyId } : {}),
  } as MarketplaceListingItem & { legacyTemplateId?: string };
}

export function memoryTemplateToListingItem(template: MarketplaceTemplate): MarketplaceListingItem {
  return { ...template, source: 'memory' };
}

export async function fetchActiveListingsFromDb(
  supabase: SupabaseClient
): Promise<MarketplaceListingRow[]> {
  const { data, error } = await supabase
    .schema('marketplace')
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('marketplace.listings fetch failed:', error.message);
    return [];
  }

  return (data ?? []) as MarketplaceListingRow[];
}

export async function fetchListingByIdFromDb(
  supabase: SupabaseClient,
  listingId: string
): Promise<MarketplaceListingRow | null> {
  const { data, error } = await supabase
    .schema('marketplace')
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as MarketplaceListingRow;
}

export async function fetchUserPurchasedListingIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .schema('marketplace')
    .from('purchases')
    .select('listing_id')
    .eq('buyer_user_id', userId);

  if (error) {
    console.error('marketplace.purchases fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => row.listing_id as string);
}

export async function fetchUserLegacyPurchasedIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('purchased_templates')
    .eq('id', userId)
    .maybeSingle();

  return Array.isArray(profile?.purchased_templates) ? profile.purchased_templates : [];
}

export async function fetchUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  return profile?.subscription_tier || 'free';
}

export function isListingOwned(
  listing: MarketplaceListingItem,
  tier: string,
  purchasedListingIds: string[],
  legacyPurchasedIds: string[]
): boolean {
  if (listing.price === 0) return true;
  if (canAccessTemplate(listing, tier, legacyPurchasedIds)) return true;
  if (purchasedListingIds.includes(listing.id)) return true;

  const legacyId = (listing as MarketplaceListingItem & { legacyTemplateId?: string }).legacyTemplateId;
  if (legacyId && legacyPurchasedIds.includes(legacyId)) return true;

  return false;
}

export function filterListings(
  listings: MarketplaceListingItem[],
  opts: { category?: string | null; search?: string | null; featured?: boolean; limit?: number }
): MarketplaceListingItem[] {
  let filtered = [...listings];

  if (opts.category && opts.category !== 'all') {
    filtered = filtered.filter((t) => t.category === opts.category);
  }

  if (opts.featured) {
    filtered = filtered.filter((t) => t.featured);
  }

  if (opts.search) {
    const q = opts.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => a.complexity - b.complexity);

  if (opts.limit && opts.limit > 0) {
    filtered = filtered.slice(0, opts.limit);
  }

  return filtered;
}

export async function resolveMarketplaceCatalog(
  supabase: SupabaseClient
): Promise<{ listings: MarketplaceListingItem[]; fromDatabase: boolean }> {
  const rows = await fetchActiveListingsFromDb(supabase);

  if (rows.length === 0) {
    return {
      listings: ALL_MARKETPLACE_TEMPLATES.map(memoryTemplateToListingItem),
      fromDatabase: false,
    };
  }

  return {
    listings: rows.map(listingRowToTemplate),
    fromDatabase: true,
  };
}

export async function resolvePurchasableItem(
  supabase: SupabaseClient,
  id: string
): Promise<{ item: MarketplaceListingItem; listingRow: MarketplaceListingRow | null } | null> {
  const dbRow = await fetchListingByIdFromDb(supabase, id);
  if (dbRow) {
    return { item: listingRowToTemplate(dbRow), listingRow: dbRow };
  }

  const template = getTemplateById(id);
  if (template) {
    return { item: memoryTemplateToListingItem(template), listingRow: null };
  }

  return null;
}

export async function syncLegacyPurchasedTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('purchased_templates')
    .eq('id', userId)
    .maybeSingle();

  const existing: string[] = Array.isArray(profile?.purchased_templates)
    ? profile.purchased_templates
    : [];

  if (existing.includes(templateId)) return;

  await supabase
    .from('profiles')
    .update({ purchased_templates: [...existing, templateId] })
    .eq('id', userId);
}

export async function recordMarketplacePurchase(
  supabase: SupabaseClient,
  params: {
    buyerUserId: string;
    listingId: string;
    stripePaymentId?: string | null;
  }
): Promise<{ created: boolean; purchaseId?: string }> {
  if (params.stripePaymentId) {
    const { data: existingByStripe } = await supabase
      .schema('marketplace')
      .from('purchases')
      .select('id')
      .eq('stripe_payment_id', params.stripePaymentId)
      .maybeSingle();

    if (existingByStripe?.id) {
      return { created: false, purchaseId: existingByStripe.id };
    }
  }

  const { data: existingByListing } = await supabase
    .schema('marketplace')
    .from('purchases')
    .select('id')
    .eq('listing_id', params.listingId)
    .eq('buyer_user_id', params.buyerUserId)
    .maybeSingle();

  if (existingByListing?.id) {
    return { created: false, purchaseId: existingByListing.id };
  }

  const { data, error } = await supabase
    .schema('marketplace')
    .from('purchases')
    .insert({
      listing_id: params.listingId,
      buyer_user_id: params.buyerUserId,
      stripe_payment_id: params.stripePaymentId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('marketplace.purchases insert failed:', error.message);
    return { created: false };
  }

  return { created: true, purchaseId: data.id };
}

export async function fulfillTemplatePurchase(
  supabase: SupabaseClient,
  params: {
    userId: string;
    listingId?: string;
    templateId?: string;
    stripePaymentId?: string | null;
  }
): Promise<{ success: boolean; resolvedTemplateId?: string }> {
  let legacyTemplateId = params.templateId;
  let listingId = params.listingId;

  if (listingId) {
    const row = await fetchListingByIdFromDb(supabase, listingId);
    if (row) {
      await recordMarketplacePurchase(supabase, {
        buyerUserId: params.userId,
        listingId,
        stripePaymentId: params.stripePaymentId,
      });
      legacyTemplateId = legacyTemplateId ?? legacyTemplateIdFromAppSource(row.app_source) ?? listingId;
    }
  }

  if (!legacyTemplateId && params.templateId) {
    legacyTemplateId = params.templateId;
  }

  if (legacyTemplateId) {
    await syncLegacyPurchasedTemplate(supabase, params.userId, legacyTemplateId);
  }

  return { success: true, resolvedTemplateId: legacyTemplateId };
}

export async function buildListingsResponse(
  supabase: SupabaseClient,
  userId: string | null,
  opts: { category?: string | null; search?: string | null; featured?: boolean; limit?: number }
) {
  const { listings: catalog, fromDatabase } = await resolveMarketplaceCatalog(supabase);

  let tier = 'free';
  let purchasedListingIds: string[] = [];
  let legacyPurchasedIds: string[] = [];

  if (userId) {
    [tier, purchasedListingIds, legacyPurchasedIds] = await Promise.all([
      fetchUserSubscriptionTier(supabase, userId),
      fetchUserPurchasedListingIds(supabase, userId),
      fetchUserLegacyPurchasedIds(supabase, userId),
    ]);
  }

  const filtered = filterListings(catalog, opts);
  const templates = filtered.map((listing) => ({
    ...listing,
    owned: userId
      ? isListingOwned(listing, tier, purchasedListingIds, legacyPurchasedIds)
      : listing.price === 0,
  }));

  const categories = [...new Set(catalog.map((t) => t.category))];
  const prices = catalog.map((t) => t.price);

  return {
    templates,
    total: templates.length,
    categories,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      freeCount: catalog.filter((t) => t.price === 0).length,
    },
    source: fromDatabase ? 'database' as const : 'memory' as const,
  };
}

export async function buildMyPurchasesResponse(
  supabase: SupabaseClient,
  userId: string
): Promise<{ purchases: MarketplacePurchaseItem[] }> {
  const legacyIds = await fetchUserLegacyPurchasedIds(supabase, userId);

  const { data: purchaseRows, error } = await supabase
    .schema('marketplace')
    .from('purchases')
    .select('id, listing_id, purchased_at, stripe_payment_id')
    .eq('buyer_user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error) {
    console.error('my-purchases fetch failed:', error.message);
  }

  const purchases: MarketplacePurchaseItem[] = [];
  const coveredLegacyIds = new Set<string>();

  if (purchaseRows?.length) {
    const listingIds = purchaseRows.map((p) => p.listing_id as string);
    const { data: listingRows } = await supabase
      .schema('marketplace')
      .from('listings')
      .select('*')
      .in('id', listingIds);

    const listingById = new Map(
      ((listingRows ?? []) as MarketplaceListingRow[]).map((row) => [row.id, row])
    );

    for (const purchase of purchaseRows) {
      const row = listingById.get(purchase.listing_id as string);
      if (!row) continue;

      const listing = listingRowToTemplate(row);
      listing.owned = true;

      const legacyId = legacyTemplateIdFromAppSource(row.app_source);
      if (legacyId) coveredLegacyIds.add(legacyId);

      purchases.push({
        id: purchase.id as string,
        purchasedAt: purchase.purchased_at as string,
        stripePaymentId: (purchase.stripe_payment_id as string | null) ?? null,
        listing,
        source: 'database',
      });
    }
  }

  for (const legacyId of legacyIds) {
    if (coveredLegacyIds.has(legacyId)) continue;

    const template = getTemplateById(legacyId);
    if (!template) continue;

    purchases.push({
      id: `legacy-${legacyId}`,
      purchasedAt: '',
      stripePaymentId: null,
      listing: { ...memoryTemplateToListingItem(template), owned: true },
      source: 'memory',
    });
  }

  return { purchases };
}
