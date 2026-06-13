import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/server-profile';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'full_name, avatar_url, timezone, language, metadata_opt_in, subscription_tier, subscription_status, cloud_credits_remaining'
    )
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      ...data,
      email: user.email,
    },
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('avatar') as File | null;
    const fullName = String(form.get('fullName') || '');
    const timezone = String(form.get('timezone') || 'Europe/London');
    const language = String(form.get('language') || 'en');
    const metadataOptIn = form.get('metadataOptIn') !== 'false';

    let avatarUrl: string | undefined;
    if (file && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: 'Avatar must be under 2MB' }, { status: 400 });
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return NextResponse.json({ error: 'Avatar must be JPG or PNG' }, { status: 400 });
      }

      const admin = createAdminClient();
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from('avatars')
        .upload(path, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        return NextResponse.json(
          { error: 'Avatar upload failed — ensure avatars bucket exists in Supabase Storage' },
          { status: 500 }
        );
      }

      const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
      avatarUrl = pub.publicUrl;
    }

    const admin = createAdminClient();
    const update: Record<string, unknown> = {
      full_name: fullName.trim(),
      timezone,
      language,
      metadata_opt_in: metadataOptIn,
      telemetry_opt_out: !metadataOptIn,
    };
    if (avatarUrl) update.avatar_url = avatarUrl;

    const { error } = await admin.from('profiles').update(update).eq('id', userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatarUrl });
  }

  const body = await request.json();
  const admin = createAdminClient();
  const update: Record<string, unknown> = {};

  if (body.fullName !== undefined) update.full_name = String(body.fullName).trim();
  if (body.timezone !== undefined) update.timezone = String(body.timezone);
  if (body.language !== undefined) update.language = String(body.language);
  if (body.metadataOptIn !== undefined) {
    update.metadata_opt_in = !!body.metadataOptIn;
    update.telemetry_opt_out = !body.metadataOptIn;
  }

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
