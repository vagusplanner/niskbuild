import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { deductCloudCredit } from '@/lib/credits';
import { recordAnonymousTelemetry } from '@/lib/record-telemetry';
import { recordUsageEvent } from '@/lib/usage-events';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import { getGroqClient } from '@/lib/groq-client';

let together: OpenAI | null = null;

function getTogetherClient(): OpenAI | null {
  const apiKey = process.env.TOGETHER_API_KEY?.trim();
  if (!apiKey) return null;
  if (!together) {
    together = new OpenAI({
      apiKey,
      baseURL: 'https://api.together.xyz/v1',
    });
  }
  return together;
}

// Get user's plan from Supabase
async function getUserPlan(userId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  return data?.subscription_tier || 'free';
}

// Get model based on user plan
function getModelForPlan(plan: string): string {
  switch (plan) {
    case 'free':
      return 'llama3-8b-8192';  // Cheaper model for free users
    case 'pro':
      return 'llama-3.3-70b-versatile';
    case 'agency':
      return 'llama-3.3-70b-versatile';
    case 'scale':
      return 'llama-3.3-70b-versatile';
    default:
      return 'llama-3.3-70b-versatile';
  }
}

// Generate with Groq
async function generateWithGroq(prompt: string, model: string): Promise<string | null> {
  const groq = getGroqClient();
  if (!groq) return null;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. No explanations. Start with <!DOCTYPE html>.' },
        { role: 'user', content: prompt },
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 4096,
    });
    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq error:', error);
    return null;
  }
}

// Generate with Together AI (fallback)
async function generateWithTogether(prompt: string): Promise<string | null> {
  const client = getTogetherClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. No explanations. Start with <!DOCTYPE html>.' },
        { role: 'user', content: prompt },
      ],
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      temperature: 0.7,
      max_tokens: 4096,
    });
    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Together AI error:', error);
    return null;
  }
}

// Main API handler
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { prompt, projectId } = await request.json();
    const userId = guard.user!.id;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const creditResult = await deductCloudCredit(userId);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient cloud credits.' },
        { status: 402 }
      );
    }

    // Get user plan for model selection
    const userPlan = await getUserPlan(userId);
    const model = getModelForPlan(userPlan);

    // Try Groq first
    console.log('🔄 Trying Groq...');
    let code = await generateWithGroq(prompt, model);
    let usedProvider = 'groq';

    // If Groq fails, try Together AI
    if (!code) {
      console.log('🔄 Groq failed, trying Together AI...');
      code = await generateWithTogether(prompt);
      usedProvider = 'together';
    }

    // If both fail, return friendly error
    if (!code) {
      await recordAnonymousTelemetry(
        {
          prompt,
          aiModelUsed: usedProvider,
          generationSuccess: false,
        },
        userId
      );

      return NextResponse.json(
        {
          error: 'Our AI engines are experiencing high demand. Please retry in 30 seconds.',
          retryAfter: 30,
        },
        { status: 503 }
      );
    }

    await recordAnonymousTelemetry(
      {
        prompt,
        generatedCode: code,
        aiModelUsed: model,
        generationSuccess: true,
      },
      userId
    );

    void recordUsageEvent({
      eventType: 'build',
      userId,
      prompt,
      projectId: typeof projectId === 'string' ? projectId : null,
      clientIp: clientIpFromHeaders(request.headers),
    });
    void touchLastBuildAt(userId);

    return NextResponse.json({
      success: true,
      code,
      provider: usedProvider,
      attempts: 1,
    });
    
  } catch (error) {
    return apiErrorResponse(error, 'Failed to generate code. Please try again.');
  }
}