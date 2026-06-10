import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { getProjectLimit } from '@/lib/project-limits';
import { isPaidAndActive } from '@/lib/tier-config';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, title, prompt, generated_code, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaidAndActive(profile?.subscription_tier, profile?.subscription_status)) {
    return NextResponse.json(
      { error: 'Active paid subscription required to save projects' },
      { status: 403 }
    );
  }

  const { title, prompt, generated_code } = await request.json();
  if (!title?.trim() || !generated_code) {
    return NextResponse.json({ error: 'Title and code are required' }, { status: 400 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const limit = getProjectLimit(tier);

  const { count, error: countError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: `Project limit reached (${limit} on ${tier} plan). Upgrade to save more.`,
        limit,
        count,
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: title.trim(),
      prompt: prompt || '',
      generated_code,
    })
    .select('id, title, prompt, generated_code, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Project id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
