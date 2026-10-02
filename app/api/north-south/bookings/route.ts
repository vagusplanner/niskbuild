import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

const SERVICE_TIERS = new Set(['ai_self_service', 'hybrid', 'bespoke']);

function trimStr(v: unknown, max = 2000): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/**
 * POST /api/north-south/bookings
 * JWT via guardApiRequest → service-role insert ns_bookings status='pending'.
 * Freeform preferred date/time; coach confirms manually (no free/busy).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withNsApiCors(request, guard.response);
  if (!guard.user) {
    return nsApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return nsApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
    }

    const client_name = trimStr(body.client_name, 200);
    const client_email = trimStr(body.client_email, 320)?.toLowerCase() ?? null;
    const client_company = trimStr(body.client_company, 200);
    const service_tier = trimStr(body.service_tier, 64);
    const session_type = trimStr(body.session_type, 200);
    const preferred_date = trimStr(body.preferred_date, 32);
    const preferred_time = trimStr(body.preferred_time, 32);
    const timezone = trimStr(body.timezone, 64) || 'UTC';
    const message = trimStr(body.message, 5000);

    if (!client_name) {
      return nsApiJson(request, { error: 'client_name is required' }, { status: 400 });
    }
    if (!client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
      return nsApiJson(request, { error: 'Valid client_email is required' }, { status: 400 });
    }
    if (!service_tier || !SERVICE_TIERS.has(service_tier)) {
      return nsApiJson(
        request,
        { error: 'service_tier must be ai_self_service, hybrid, or bespoke' },
        { status: 400 }
      );
    }
    if (!session_type) {
      return nsApiJson(request, { error: 'session_type is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await admin
      .schema('firstparty')
      .from('ns_bookings')
      .insert({
        user_id: guard.user.id,
        client_name,
        client_email,
        client_company,
        service_tier,
        session_type,
        preferred_date,
        preferred_time,
        timezone,
        message,
        status: 'pending',
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[ns-bookings] insert failed:', error?.message);
      return nsApiJson(
        request,
        { error: error?.message || 'Failed to create booking' },
        { status: 500 }
      );
    }

    return nsApiJson(request, {
      ...data,
      created_date: data.created_at,
      updated_date: data.updated_at,
    });
  } catch (error) {
    captureApiException(error);
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}
