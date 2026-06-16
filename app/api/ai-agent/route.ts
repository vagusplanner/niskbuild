import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { isAdminUser } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeAgentAnalytics,
  runHelpAgent,
  type AgentMessage,
  type PreferredProvider,
} from '@/lib/ai-agent';

async function fetchAdminStats(): Promise<string> {
  try {
    const supabase = createAdminClient();
    const [users, projects, openTickets] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']),
    ]);

    return [
      `- Total users: ${users.count ?? '?'}`,
      `- Total projects: ${projects.count ?? '?'}`,
      `- Open support tickets: ${openTickets.count ?? '?'}`,
    ].join('\n');
  } catch {
    return '- Stats unavailable (run support-tickets migration if needed)';
  }
}

function parsePreferredProvider(value: unknown): PreferredProvider {
  if (value === 'ollama' || value === 'groq' || value === 'auto') return value;
  return 'auto';
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get('mode') === 'admin' ? 'admin' : 'user';
  if (mode === 'admin' && !isAdminUser(guard.user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('agent_conversations')
      .select('prompt_type, provider, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (mode === 'user') {
      query = query.eq('user_id', guard.user.id).eq('mode', 'user');
    } else {
      query = query.eq('mode', 'admin');
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({
        analytics: computeAgentAnalytics([]),
        available: false,
      });
    }

    return NextResponse.json({
      analytics: computeAgentAnalytics(data || []),
      available: true,
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json({ analytics: computeAgentAnalytics([]), available: false });
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 24 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const mode = body.mode === 'admin' ? 'admin' : 'user';
    const preferredProvider = parsePreferredProvider(body.preferredProvider);
    const history: AgentMessage[] = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
          .filter(
            (m: unknown): m is AgentMessage =>
              !!m &&
              typeof m === 'object' &&
              'role' in m &&
              'content' in m &&
              (m as AgentMessage).role !== undefined
          )
          .slice(-8)
      : [];

    if (!message || message.length < 2) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const user = guard.user;
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to use the assistant' }, { status: 401 });
    }

    if (mode === 'admin' && !isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = createAdminClient();
    let userTier = 'sandbox';
    let projectName = 'No active project';

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, email')
      .eq('id', user.id)
      .maybeSingle();

    userTier = profile?.subscription_tier || 'sandbox';

    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (project?.title) projectName = project.title;
    }

    const adminStats = mode === 'admin' ? await fetchAdminStats() : undefined;

    const result = await runHelpAgent(
      message,
      {
        userTier,
        projectName,
        userEmail: profile?.email || user.email,
        mode,
        adminStats,
        preferredProvider,
      },
      history
    );

    try {
      await supabase.from('agent_conversations').insert({
        user_id: user.id,
        message,
        response: result.response,
        provider: result.provider,
        prompt_type: result.promptType,
        mode,
        project_id: projectId,
      });
    } catch {
      // Table may not exist until migration is applied
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      provider: result.provider,
      promptType: result.promptType,
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        response:
          "I'm having trouble right now. Try again in a moment, or reach human support at /dashboard/support.",
      },
      { status: 500 }
    );
  }
}
