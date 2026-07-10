import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  canUseLocalOllama,
  canUseSandboxLocalGenerate,
  LOCAL_OLLAMA_LOCKED_MESSAGE,
} from '@/lib/tier-config';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { logBuildPerformance } from '@/lib/build-performance-server';
import { buildOllamaGeneratePrompt } from '@/lib/html-code-system-prompt';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', guard.user!.id)
      .single();

    const tier = profile?.subscription_tier || 'free';
    if (!canUseLocalOllama(tier) && !canUseSandboxLocalGenerate(tier)) {
      return NextResponse.json({ error: LOCAL_OLLAMA_LOCKED_MESSAGE }, { status: 403 });
    }

    const { prompt, projectId } = await request.json();

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const fullPrompt = buildOllamaGeneratePrompt(prompt);

    const localStartedAt = Date.now();
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: fullPrompt,
        stream: false,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama error: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const durationMs = Date.now() - localStartedAt;
    const code = typeof data.response === 'string' ? data.response : '';

    logBuildPerformance(guard.user!.id, {
      source: 'local_ollama',
      ttfcMs: durationMs,
      durationMs,
      success: !!code.trim(),
      codeChars: code.length,
    });

    void recordUsageEvent({
      eventType: 'build',
      userId: guard.user!.id,
      prompt,
      projectId: typeof projectId === 'string' ? projectId : null,
      clientIp: clientIpFromHeaders(request.headers),
    });
    void recordPromptCategoryStat({ userId: guard.user!.id, prompt });
    void touchLastBuildAt(guard.user!.id);
    
    return NextResponse.json({ 
      success: true, 
      code,
      model: 'qwen2.5-coder:7b',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    captureApiException(error);
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate. Make sure Ollama is running (llama icon in menu bar).',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}