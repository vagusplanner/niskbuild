import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  getSuggestedDocArticles,
  getUserDocTier,
  listDocArticles,
  searchDocArticles,
} from '@/lib/docs/fetch-articles';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const q = request.nextUrl.searchParams.get('q') ?? '';
  const context = request.nextUrl.searchParams.get('context') ?? '';
  const tier = await getUserDocTier();

  if (q.trim()) {
    const results = await searchDocArticles(q, tier);
    return NextResponse.json({ articles: results });
  }

  if (context) {
    const suggested = await getSuggestedDocArticles(context, tier);
    return NextResponse.json({ articles: suggested });
  }

  const articles = await listDocArticles(tier);
  return NextResponse.json({ articles });
}
