import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import {
  applyBuilderAppEdit,
  loadBuilderAppState,
  resolveBuilderApp,
} from '@/lib/builder-apps/handlers';

type RouteContext = { params: Promise<{ appId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  try {
    const { appId } = await context.params;
    const app = resolveBuilderApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'Unknown builder app' }, { status: 404 });
    }

    const targetId = request.nextUrl.searchParams.get('target') || app.defaultTargetId;
    const state = await loadBuilderAppState(app, targetId);

    return NextResponse.json({ success: true, ...state });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load builder app state');
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  try {
    const { appId } = await context.params;
    const app = resolveBuilderApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'Unknown builder app' }, { status: 404 });
    }

    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const targetId = typeof body.targetId === 'string' ? body.targetId : app.defaultTargetId;
    const useLocal = body.useLocal === true;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await applyBuilderAppEdit({
      app,
      userId: guard.user!.id,
      prompt,
      targetId,
      useLocal,
    });

    if (!('success' in result) || !result.success) {
      return NextResponse.json(
        {
          error: result.error,
          upgrade: 'upgrade' in result ? result.upgrade : undefined,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Builder app edit failed');
  }
}
