import { NextResponse } from 'next/server';
import { getAIProviderStatus } from '@/lib/ai-providers';

export async function GET() {
  const status = await getAIProviderStatus();
  return NextResponse.json(status);
}