import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { listAppImports, runAppImportPipeline } from '@/lib/app-import/pipeline';
import type { AppSourceLayer } from '@/lib/app-import/types';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export const maxDuration = 120;

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const imports = await listAppImports(50);
    return NextResponse.json({ imports });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load imports');
  }
}

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const form = await request.formData();
    const file = form.get('archive');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'archive file is required (ZIP)' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip archives are supported' }, { status: 400 });
    }

    if (file.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: 'Archive must be under 50MB' }, { status: 400 });
    }

    const title = String(form.get('title') || file.name.replace(/\.zip$/i, '')).trim();
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const sourceLayerRaw = String(form.get('sourceLayer') || 'subscriber');
    const sourceLayer: AppSourceLayer =
      sourceLayerRaw === 'firstparty' ? 'firstparty' : 'subscriber';

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runAppImportPipeline({
      zipBuffer: buffer,
      importedBy: owner.user.id,
      input: {
        title,
        description: String(form.get('description') || '').trim() || undefined,
        priceCents: parseInt(String(form.get('priceCents') || '0'), 10) || 0,
        sourceLayer,
        publishActive: form.get('publishActive') === 'true',
        registerFirstparty:
          form.get('registerFirstparty') === 'true' || sourceLayer === 'firstparty',
      },
    });

    return NextResponse.json({ success: true, import: result });
  } catch (error) {
    return apiErrorResponse(error, 'Import failed');
  }
}
