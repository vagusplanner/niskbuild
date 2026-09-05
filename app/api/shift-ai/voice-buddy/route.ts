import { NextRequest, NextResponse } from 'next/server';
import {
  BUDDY_GAMES,
  evaluateVoiceBuddyAnswer,
  generateVoiceBuddyRound,
  type BuddyGameId,
} from '@/lib/shift-ai/voice-buddy';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

const VALID_GAME_IDS = new Set(BUDDY_GAMES.map((g) => g.id));

/**
 * Privacy: this route accepts transcribed TEXT only.
 * Audio is captured and transcribed in the browser via the Web Speech API —
 * no audio blobs or recordings are ever sent to the server.
 */
export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const action = payload.action === 'evaluate' ? 'evaluate' : 'round';

  if (action === 'round') {
    const gameId = typeof payload.gameId === 'string' ? payload.gameId.trim() : '';
    const friendName =
      typeof payload.friendName === 'string' && payload.friendName.trim()
        ? payload.friendName.trim().slice(0, 24)
        : 'Pip';

    if (!VALID_GAME_IDS.has(gameId as BuddyGameId)) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }

    const result = await generateVoiceBuddyRound(gameId as BuddyGameId, friendName);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ round: result.round });
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const expected = typeof payload.expected === 'string' ? payload.expected.trim() : '';
  const transcript = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
  const gameId = typeof payload.gameId === 'string' ? payload.gameId.trim() : 'phonics';

  if (!prompt || !expected || !transcript) {
    return NextResponse.json(
      { error: 'prompt, expected, and transcript (text) are required' },
      { status: 400 }
    );
  }

  const result = await evaluateVoiceBuddyAnswer(
    VALID_GAME_IDS.has(gameId as BuddyGameId) ? (gameId as BuddyGameId) : 'phonics',
    prompt,
    expected,
    transcript
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ evaluation: result.evaluation });
}
