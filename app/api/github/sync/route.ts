import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { apiErrorResponse } from '@/lib/api-error';
import { listGitHubRepos, pushFilesToGitHub } from '@/lib/github-sync';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'GitHub token required' }, { status: 400 });
  }

  try {
    const repos = await listGitHubRepos(token);
    return NextResponse.json({ repos });
  } catch (err) {
    return apiErrorResponse(err, 'Failed to fetch GitHub repositories');
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Please sign in to sync with GitHub' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const repo = typeof body.repo === 'string' ? body.repo.trim() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const commitMessage =
      typeof body.commitMessage === 'string' && body.commitMessage.trim()
        ? body.commitMessage.trim()
        : `Update from NiskBuild — ${new Date().toISOString()}`;

    const files = Array.isArray(body.files)
      ? body.files
          .filter(
            (f: unknown): f is { path: string; content: string } =>
              typeof f === 'object' &&
              f !== null &&
              typeof (f as { path?: unknown }).path === 'string' &&
              typeof (f as { content?: unknown }).content === 'string'
          )
          .map((f: { path: string; content: string }) => ({
            path: f.path.trim(),
            content: f.content,
          }))
      : [];

    if (!repo || !token) {
      return NextResponse.json({ error: 'Repository and GitHub token are required' }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const result = await pushFilesToGitHub({ repo, token, files, commitMessage });

    return NextResponse.json({
      success: true,
      commitUrl: result.commitUrl,
    });
  } catch (err) {
    return apiErrorResponse(err, 'GitHub sync failed');
  }
}
