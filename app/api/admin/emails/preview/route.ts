import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { renderTemplateHtml } from '@/lib/email/template-registry';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const key = request.nextUrl.searchParams.get('key')?.trim();
    if (!key) {
      return NextResponse.json({ error: 'key query param required' }, { status: 400 });
    }

    const rendered = renderTemplateHtml(key);
    if (!rendered) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    return NextResponse.json(rendered);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to render template preview');
  }
}
