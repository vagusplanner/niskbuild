import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import {
  ALL_MARKETPLACE_TEMPLATES,
  canAccessTemplate,
  getTemplateById,
} from '@/lib/marketplace-templates';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 60 });
  if (!guard.ok) return guard.response;

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');
  const limit = searchParams.get('limit');

  let filtered = [...ALL_MARKETPLACE_TEMPLATES];

  if (category && category !== 'all') {
    filtered = filtered.filter((t) => t.category === category);
  }

  if (featured === 'true') {
    filtered = filtered.filter((t) => t.featured);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower)
    );
  }

  filtered.sort((a, b) => a.complexity - b.complexity);

  if (limit) {
    filtered = filtered.slice(0, parseInt(limit, 10));
  }

  let purchasedIds: string[] = [];
  let tier = 'free';

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, purchased_templates')
        .eq('id', user.id)
        .single();

      tier = profile?.subscription_tier || 'free';
      purchasedIds = Array.isArray(profile?.purchased_templates)
        ? profile.purchased_templates
        : [];
    }
  } catch {
    // Public browse without auth
  }

  const templates = filtered.map((t) => ({
    ...t,
    owned: canAccessTemplate(t, tier, purchasedIds),
  }));

  return NextResponse.json({
    templates,
    total: templates.length,
    categories: [...new Set(ALL_MARKETPLACE_TEMPLATES.map((t) => t.category))],
    priceRange: { min: 0, max: 49, freeCount: 2 },
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await request.json();
    const template = getTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch template');
  }
}
