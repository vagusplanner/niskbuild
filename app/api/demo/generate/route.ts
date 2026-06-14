import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { generateDemoBlueprint } from '@/lib/demo-generate';

const DEMO_RATE_LIMIT = 3;
const DEMO_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, {
    requireAuth: false,
    rateLimit: DEMO_RATE_LIMIT,
    rateLimitWindowMs: DEMO_WINDOW_MS,
  });
  if (!guard.ok) return guard.response;

  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await generateDemoBlueprint(prompt);
    if (!result.success || !result.blueprint) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate preview' },
        { status: 500 }
      );
    }

    return NextResponse.json({ blueprint: result.blueprint });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to generate demo preview');
  }
}
