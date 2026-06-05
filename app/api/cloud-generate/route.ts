import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/ai-providers';
import { supabase } from '@/lib/supabaseClient';

async function getUserTier(userId: string): Promise<string> {
  if (!userId) return 'free';
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();
    return profile?.subscription_tier || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId, useLocal = false } = await request.json();

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get user tier for provider selection
    const userTier = await getUserTier(userId);
    console.log(`User tier: ${userTier}, generating for prompt: ${prompt.substring(0, 50)}...`);

    const result = await generateCode(prompt, userTier);

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