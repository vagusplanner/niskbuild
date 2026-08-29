import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureApiException } from '@/lib/api-error';
import { canUseWhiteLabelBranding } from '@/lib/tier-access-server';
import {
  ensureSoloOrganizationForUser,
  getPrimaryOrgIdForBillingOwner,
} from '@/lib/ensure-organization';
import { getMembership } from '@/lib/organization-team';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function requireOwnerOrg(userId: string, orgId: string) {
  const membership = await getMembership(orgId, userId);
  if (!membership || membership.role !== 'owner') {
    throw new Error('Only the organization owner can manage white-label branding.');
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier;
    const status = profile?.subscription_status;
    const allowed = canUseWhiteLabelBranding(tier, status);

    await ensureSoloOrganizationForUser({
      userId: user.id,
      email: profile?.email || user.email,
      tier,
      status,
    });

    const orgId = await getPrimaryOrgIdForBillingOwner(user.id);
    if (!orgId) {
      return NextResponse.json({
        allowed: false,
        org: null,
        message: 'White-label branding requires an organization on White-Label or higher.',
      });
    }

    const membership = await getMembership(orgId, user.id);
    const isOwner = membership?.role === 'owner';

    const admin = createAdminClient();
    const { data: org, error } = await admin
      .from('organizations')
      .select(
        'id, name, brand_app_name, brand_logo_url, hide_niskbuild_attribution, billing_owner_id'
      )
      .eq('id', orgId)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      allowed: allowed && isOwner,
      isOwner,
      org: {
        id: org.id,
        name: org.name,
        brandAppName: org.brand_app_name ?? '',
        brandLogoUrl: org.brand_logo_url ?? '',
        hideNiskbuildAttribution: !!org.hide_niskbuild_attribution,
      },
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load branding' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier;
    const status = profile?.subscription_status;
    if (!canUseWhiteLabelBranding(tier, status)) {
      return NextResponse.json(
        {
          error:
            'White-label branding requires an active White-Label, Team Enterprise, or Sovereign plan.',
        },
        { status: 403 }
      );
    }

    await ensureSoloOrganizationForUser({
      userId: user.id,
      email: profile?.email || user.email,
      tier,
      status,
    });

    const orgId = await getPrimaryOrgIdForBillingOwner(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    await requireOwnerOrg(user.id, orgId);

    const contentType = request.headers.get('content-type') || '';
    const admin = createAdminClient();
    const update: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const brandAppName = String(form.get('brandAppName') || '').trim();
      const hideRaw = form.get('hideNiskbuildAttribution');
      // Option B: default hide true for WL+ when saving
      const hideAttribution =
        hideRaw === null || hideRaw === undefined
          ? true
          : hideRaw === 'true' || hideRaw === '1' || hideRaw === 'on';

      if (brandAppName.length > 80) {
        return NextResponse.json(
          { error: 'App name must be 80 characters or fewer.' },
          { status: 400 }
        );
      }

      update.brand_app_name = brandAppName || null;
      // Defense: only persist true hide when WL+ (already gated above)
      update.hide_niskbuild_attribution = hideAttribution;

      const file = form.get('logo') as File | null;
      if (file && file.size > 0) {
        if (file.size > MAX_LOGO_BYTES) {
          return NextResponse.json({ error: 'Logo must be under 2MB' }, { status: 400 });
        }
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
          return NextResponse.json(
            { error: 'Logo must be PNG, JPG, WebP, or SVG' },
            { status: 400 }
          );
        }
        const ext =
          file.type === 'image/png'
            ? 'png'
            : file.type === 'image/webp'
              ? 'webp'
              : file.type === 'image/svg+xml'
                ? 'svg'
                : 'jpg';
        const path = `org-brands/${orgId}/${Date.now()}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await admin.storage
          .from('avatars')
          .upload(path, buffer, { contentType: file.type, upsert: true });
        if (uploadError) {
          return NextResponse.json(
            {
              error:
                'Logo upload failed — ensure avatars bucket exists in Supabase Storage',
            },
            { status: 500 }
          );
        }
        const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
        update.brand_logo_url = pub.publicUrl;
      }
    } else {
      const body = await request.json();
      if (typeof body.brandAppName === 'string') {
        const name = body.brandAppName.trim();
        if (name.length > 80) {
          return NextResponse.json(
            { error: 'App name must be 80 characters or fewer.' },
            { status: 400 }
          );
        }
        update.brand_app_name = name || null;
      }
      if (typeof body.hideNiskbuildAttribution === 'boolean') {
        update.hide_niskbuild_attribution = body.hideNiskbuildAttribution;
      }
      if (body.clearLogo === true) {
        update.brand_logo_url = null;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('organizations')
      .update(update)
      .eq('id', orgId)
      .select(
        'id, name, brand_app_name, brand_logo_url, hide_niskbuild_attribution'
      )
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      org: {
        id: data.id,
        name: data.name,
        brandAppName: data.brand_app_name ?? '',
        brandLogoUrl: data.brand_logo_url ?? '',
        hideNiskbuildAttribution: !!data.hide_niskbuild_attribution,
      },
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save branding' },
      { status: 400 }
    );
  }
}
