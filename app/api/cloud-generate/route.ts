import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const { prompt, useLocal = false } = await request.json();

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateCode(prompt, useLocal);

    if (result.success) {
      return NextResponse.json({
        success: true,
        code: result.code,
        source: result.provider,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'All AI providers failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code' },
      { status: 500 }
    );
  }
}