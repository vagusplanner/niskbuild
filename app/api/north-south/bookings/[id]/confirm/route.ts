import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isNsStaffUser } from '@/lib/ns-staff';
import {
  createNsBookingCalendarEvent,
  fetchNsCalendarEvent,
} from '@/lib/ns-google-calendar/events';
import { NsGoogleCalendarAuthError } from '@/lib/ns-google-calendar/oauth';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/north-south/bookings/[id]/confirm
 * Staff-only: create Google Calendar event with Meet, invite client, confirm booking.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 15 });
  if (!guard.ok) return withNsApiCors(request, guard.response);
  if (!guard.user) {
    return nsApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await isNsStaffUser(guard.user.id);
  if (!staff) {
    return nsApiJson(
      request,
      { error: 'Only North South staff can confirm bookings', code: 'NS_STAFF_REQUIRED' },
      { status: 403 }
    );
  }

  const { id: bookingId } = await context.params;
  if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return nsApiJson(request, { error: 'Invalid booking id' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: booking, error: loadError } = await admin
      .schema('firstparty')
      .from('ns_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (loadError) {
      return nsApiJson(request, { error: loadError.message }, { status: 500 });
    }
    if (!booking) {
      return nsApiJson(request, { error: 'Booking not found' }, { status: 404 });
    }
    if (booking.status === 'cancelled') {
      return nsApiJson(request, { error: 'Booking is cancelled' }, { status: 400 });
    }
    if (booking.status === 'confirmed' && booking.calendar_event_id) {
      return nsApiJson(request, {
        success: true,
        alreadyConfirmed: true,
        booking: {
          ...booking,
          created_date: booking.created_at,
          updated_date: booking.updated_at,
        },
      });
    }

    const created = await createNsBookingCalendarEvent(booking, {
      coachUserId: guard.user.id,
    });

    // Verify event exists via Google Calendar API (evidence-grade).
    let googleFetch: Record<string, unknown> | null = null;
    try {
      googleFetch = await fetchNsCalendarEvent(created.calendar_event_id, {
        coachUserId: guard.user.id,
      });
    } catch (verifyErr) {
      console.warn('[ns-bookings/confirm] post-create fetch failed:', verifyErr);
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .schema('firstparty')
      .from('ns_bookings')
      .update({
        status: 'confirmed',
        calendar_event_id: created.calendar_event_id,
        meet_link: created.meet_link,
        updated_at: now,
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (updateError || !updated) {
      return nsApiJson(
        request,
        {
          error: updateError?.message || 'Calendar created but booking update failed',
          calendar_event_id: created.calendar_event_id,
          meet_link: created.meet_link,
        },
        { status: 500 }
      );
    }

    return nsApiJson(request, {
      success: true,
      booking: {
        ...updated,
        created_date: updated.created_at,
        updated_date: updated.updated_at,
      },
      calendar_event_id: created.calendar_event_id,
      meet_link: created.meet_link,
      html_link: created.html_link,
      hangout_link: created.hangout_link,
      google_event_verified: Boolean(
        googleFetch &&
          (googleFetch.id === created.calendar_event_id ||
            googleFetch.hangoutLink ||
            googleFetch.conferenceData)
      ),
      google_hangout_link:
        typeof googleFetch?.hangoutLink === 'string' ? googleFetch.hangoutLink : null,
    });
  } catch (error) {
    captureApiException(error);
    if (error instanceof NsGoogleCalendarAuthError) {
      const status = error.code === 'not_connected' ? 409 : 503;
      return nsApiJson(
        request,
        { error: error.message, code: error.code },
        { status }
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to confirm booking';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}
