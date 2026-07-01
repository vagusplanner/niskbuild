import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { runHtmlProjectAudit } from '@/lib/html-project-audit';
import { DEFAULT_SEO_SETTINGS, type ProjectSeoSettings } from '@/lib/seo-types';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const files =
      body.files && typeof body.files === 'object' && !Array.isArray(body.files)
        ? (body.files as Record<string, string>)
        : {};

    const generatedCode =
      typeof body.generatedCode === 'string' ? body.generatedCode : undefined;
    const activeFile = typeof body.activeFile === 'string' ? body.activeFile : 'index.html';
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const subscriptionTier =
      typeof body.subscriptionTier === 'string' ? body.subscriptionTier : 'free';
    const subscriptionStatus =
      typeof body.subscriptionStatus === 'string' ? body.subscriptionStatus : 'inactive';

    let seo: ProjectSeoSettings = DEFAULT_SEO_SETTINGS;
    if (body.seo && typeof body.seo === 'object') {
      seo = { ...DEFAULT_SEO_SETTINGS, ...body.seo } as ProjectSeoSettings;
    }

    const audit = runHtmlProjectAudit({
      files,
      generatedCode,
      activeFile,
      seo,
      subscriptionTier,
      subscriptionStatus,
      projectId,
    });

    return NextResponse.json({
      success: true,
      report: audit.report,
      audit,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Audit failed';
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
