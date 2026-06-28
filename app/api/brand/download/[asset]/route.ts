import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { BRAND_PDF_FILES } from '@/lib/brand-assets';

const LOGO_DIR = join(process.cwd(), 'public', 'logo');

type RouteParams = { params: Promise<{ asset: string }> };

/** Force-download official brand PDFs with correct filename and MIME type */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { asset } = await params;
  const entry = BRAND_PDF_FILES[asset];

  if (!entry) {
    return NextResponse.json({ error: 'Unknown brand asset' }, { status: 404 });
  }

  const filePath = join(LOGO_DIR, entry.path);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Brand file not found on server' }, { status: 404 });
  }

  const buffer = readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${entry.filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
