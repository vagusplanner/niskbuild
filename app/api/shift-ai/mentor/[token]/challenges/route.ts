import { NextRequest, NextResponse } from 'next/server';
import { createMentorChallenge } from '@/lib/shift-ai/mentor-challenges';
import { resolveMentorToken } from '@/lib/shift-ai/token-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const resolved = await resolveMentorToken(token);

  if (!resolved) {
    return NextResponse.json({ error: 'Invalid or expired mentor link' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const description =
    typeof payload.description === 'string' ? payload.description.trim() : null;
  const rewardText =
    typeof payload.rewardText === 'string' ? payload.rewardText.trim() : null;

  if (!title) {
    return NextResponse.json({ error: 'Challenge title is required' }, { status: 400 });
  }

  try {
    const challenge = await createMentorChallenge({
      studentId: resolved.studentId,
      mentorTokenId: resolved.tokenId,
      title,
      description,
      rewardText,
    });
    return NextResponse.json({ challenge });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
