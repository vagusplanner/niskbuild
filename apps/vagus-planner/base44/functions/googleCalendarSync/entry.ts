/**
 * googleCalendarSync — Handles Google Calendar webhook events (two-way sync).
 * Called by the Base44 connector automation whenever Google Calendar changes.
 * Uses incremental sync via syncToken stored in SyncState entity.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const state = body.data?._provider_meta?.['x-goog-resource-state'];
    console.log('GCal webhook state:', state);

    // Acknowledge sync handshake
    if (state === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load persisted sync token
    const existing = await base44.asServiceRole.entities.SyncState.filter({ service: 'googlecalendar' });
    const syncRecord = existing.length > 0 ? existing[0] : null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${encodeURIComponent(syncRecord.sync_token)}`;
    } else {
      // First sync: last 30 days + next 90 days
      const tMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      url += `&timeMin=${encodeURIComponent(tMin)}`;
    }

    let res = await fetch(url, { headers: authHeader });

    // syncToken expired — full resync
    if (res.status === 410) {
      console.log('syncToken expired, doing full resync');
      const tMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&timeMin=${encodeURIComponent(tMin)}`;
      res = await fetch(url, { headers: authHeader });
    }

    if (!res.ok) {
      console.error('GCal API error:', res.status, await res.text());
      return Response.json({ status: 'api_error', code: res.status }, { status: 200 });
    }

    // Drain all pages
    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = null;

    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      const nextUrl = url + `&pageToken=${encodeURIComponent(pageData.nextPageToken)}`;
      const nextRes = await fetch(nextUrl, { headers: authHeader });
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    console.log(`Processing ${allItems.length} changed GCal events`);

    // Process each changed event
    for (const gcEvent of allItems) {
      await syncGCalEventToApp(base44, gcEvent);
    }

    // Persist the new syncToken
    if (newSyncToken) {
      const syncData = {
        service: 'googlecalendar',
        sync_token: newSyncToken,
        last_synced_at: new Date().toISOString(),
      };
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, syncData);
      } else {
        await base44.asServiceRole.entities.SyncState.create(syncData);
      }
    }

    return Response.json({ status: 'ok', processed: allItems.length });
  } catch (error) {
    console.error('googleCalendarSync error:', error.message);
    return Response.json({ error: error.message }, { status: 200 }); // always 200 to avoid retry loops
  }
});

async function syncGCalEventToApp(base44, gcEvent) {
  try {
    // Find existing app event by external_calendar_id
    const existing = await base44.asServiceRole.entities.Event.filter({
      external_calendar_id: gcEvent.id,
      source: 'google_calendar',
    });

    // Deleted event
    if (gcEvent.status === 'cancelled') {
      if (existing.length > 0) {
        await base44.asServiceRole.entities.Event.delete(existing[0].id);
        console.log('Deleted app event for cancelled GCal event:', gcEvent.id);
      }
      return;
    }

    const startRaw = gcEvent.start?.dateTime || gcEvent.start?.date;
    const endRaw   = gcEvent.end?.dateTime   || gcEvent.end?.date;
    if (!startRaw) return;

    const isAllDay = !gcEvent.start?.dateTime;
    const startDate = new Date(startRaw);
    const endDate   = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const eventData = {
      title: gcEvent.summary || '(No title)',
      description: gcEvent.description || '',
      location: gcEvent.location || '',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_all_day: isAllDay,
      external_calendar_type: 'google',
      external_calendar_id: gcEvent.id,
      source: 'google_calendar',
      is_synced: true,
      color: gcEvent.colorId ? `gcal-${gcEvent.colorId}` : '',
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.Event.update(existing[0].id, eventData);
    } else {
      await base44.asServiceRole.entities.Event.create(eventData);
    }
  } catch (err) {
    console.error('Error syncing GCal event', gcEvent.id, err.message);
  }
}