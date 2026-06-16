import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import {
  extractComponents,
  extractFigmaFileKey,
  fetchFigmaFile,
  generateReactCode,
} from '@/lib/figma-import';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  if (!guard.user) {
    return NextResponse.json({ error: 'Please sign in to import from Figma' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const figmaUrl = typeof body.figmaUrl === 'string' ? body.figmaUrl.trim() : '';
    const figmaToken = typeof body.figmaToken === 'string' ? body.figmaToken.trim() : '';

    if (!figmaUrl || !figmaToken) {
      return NextResponse.json({ error: 'Figma URL and token required' }, { status: 400 });
    }

    if (!figmaToken.startsWith('figd_')) {
      return NextResponse.json(
        { error: 'Token should be a Figma personal access token (starts with figd_)' },
        { status: 400 }
      );
    }

    const fileKey = extractFigmaFileKey(figmaUrl);
    if (!fileKey) {
      return NextResponse.json(
        { error: 'Invalid Figma URL — use a figma.com/file/… or figma.com/design/… link' },
        { status: 400 }
      );
    }

    const fileData = await fetchFigmaFile(fileKey, figmaToken);
    const components = extractComponents(fileData);
    const code = generateReactCode(components);

    return NextResponse.json({
      success: true,
      fileKey,
      fileName: fileData.name ?? null,
      components,
      code,
    });
  } catch (error) {
    console.error('Figma import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to import Figma file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
