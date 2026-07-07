import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import {
  fulfillTemplatePurchase,
  resolvePurchasableItem,
  isListingOwned,
  fetchUserLegacyPurchasedIds,
  fetchUserPurchasedListingIds,
  fetchUserSubscriptionTier,
  isImportedStorageListing,
} from '@/lib/marketplace-service';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { listingId } = await request.json();
    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ error: 'listingId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const userId = guard.user!.id;

    const resolved = await resolvePurchasableItem(supabase, listingId);
    if (!resolved) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const { item, listingRow } = resolved;

    if (isImportedStorageListing(listingRow.app_source ?? {})) {
      return NextResponse.json(
        { error: 'Imported app delivery is coming soon — full workspace clone is not available yet.' },
        { status: 503 }
      );
    }

    if (item.price > 0) {
      const [tier, purchasedListingIds, legacyIds] = await Promise.all([
        fetchUserSubscriptionTier(supabase, userId),
        fetchUserPurchasedListingIds(supabase, userId),
        fetchUserLegacyPurchasedIds(supabase, userId),
      ]);

      if (!isListingOwned(item, tier, purchasedListingIds, legacyIds)) {
        return NextResponse.json(
          { error: 'Paid listings require checkout', requiresPurchase: true },
          { status: 402 }
        );
      }
    }

    const result = await fulfillTemplatePurchase(supabase, {
      userId,
      listingId: listingRow?.id,
      templateId: item.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Clone failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: result.clonedProjectId ?? null,
      templateId: result.resolvedTemplateId,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Clone failed');
  }
}
