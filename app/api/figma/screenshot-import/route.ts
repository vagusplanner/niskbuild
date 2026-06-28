import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  analyzeFigmaScreenshot,
  buildFigmaScreenshotPrompt,
} from '@/lib/groq-vision';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PROJECT_ASSETS_BUCKET = 'project-assets';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;

  try {
    const form = await request.formData();
    const file = form.get('image') as File | null;
    const figmaReferenceLink =
      typeof form.get('figmaReferenceLink') === 'string'
        ? String(form.get('figmaReferenceLink')).trim()
        : '';
    const userPrompt =
      typeof form.get('userPrompt') === 'string' ? String(form.get('userPrompt')).trim() : '';
    const projectId =
      typeof form.get('projectId') === 'string' ? String(form.get('projectId')).trim() : '';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Screenshot image is required' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 });
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return NextResponse.json({ error: 'Image must be PNG or JPG' }, { status: 400 });
    }

    const admin = createAdminClient();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const folder = projectId || 'drafts';
    const path = `${userId}/${folder}/figma-imports/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(PROJECT_ASSETS_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            'Screenshot upload failed — ensure the project-assets bucket exists in Supabase Storage',
        },
        { status: 500 }
      );
    }

    const { data: pub } = admin.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(path);
    const screenshotUrl = pub.publicUrl;

    const designDescription = await analyzeFigmaScreenshot(screenshotUrl, userPrompt);
    if (!designDescription) {
      return NextResponse.json(
        { error: 'Failed to analyze screenshot — vision model unavailable or image unreadable' },
        { status: 503 }
      );
    }

    if (projectId) {
      const { data: project } = await admin
        .from('projects')
        .select('project_context')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (project) {
        const existingContext =
          project.project_context && typeof project.project_context === 'object'
            ? (project.project_context as Record<string, unknown>)
            : {};

        await admin
          .from('projects')
          .update({
            project_context: {
              ...existingContext,
              figmaImport: {
                screenshotUrl,
                figmaReferenceLink: figmaReferenceLink || null,
                importedAt: new Date().toISOString(),
              },
            },
          })
          .eq('id', projectId)
          .eq('user_id', userId);
      }
    }

    const combinedPrompt = buildFigmaScreenshotPrompt(
      designDescription,
      userPrompt,
      figmaReferenceLink
    );

    return NextResponse.json({
      success: true,
      designDescription,
      combinedPrompt,
      screenshotUrl,
      figmaReferenceLink: figmaReferenceLink || null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Figma screenshot import failed');
  }
}
