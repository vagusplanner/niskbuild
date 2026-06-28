import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const articleId = typeof body.articleId === 'string' ? body.articleId : '';
  const helpful = body.helpful;
  const comment = typeof body.comment === 'string' ? body.comment.trim() : null;

  if (!articleId || typeof helpful !== 'boolean') {
    return NextResponse.json({ error: 'articleId and helpful are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('doc_feedback').upsert(
    {
      article_id: articleId,
      user_id: guard.user!.id,
      helpful,
      comment: comment || null,
    },
    { onConflict: 'article_id,user_id' }
  );

  if (error) {
    console.error('doc feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
