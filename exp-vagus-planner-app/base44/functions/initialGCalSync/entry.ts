/**
 * initialGCalSync — Triggered manually from the UI to do a full initial pull
 * of Google Calendar events into the app. Also resets the syncToken.
 * Admin or authenticated user can call this.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Fetch next 90 days + past 30 days
    const tMin = new Date(Date.now() - 30  * 24 * 60 * 60 * 1000).toISOString();
    const tMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&timeMin=${encodeURIComponent(tMin)}&timeMax=${encodeURIComponent(tMax)}`;

    const allItems = [];
    let newSyncToken = null;
    let pageToken = null;

    do {
      const url = pageToken ? `${baseUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) {
        const err = await res.text();
        console.error('GCal fetch error:', res.status, err);
        return Response.json({ error: `GCal API error: ${res.status}` }, { status: 500 });
      }
      const data = await res.json();
      allItems.push(...(data.items || []));
      if (data.nextSyncToken) newSyncToken = data.nextSyncToken;
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    console.log(`Initial sync: fetched ${allItems.length} GCal events`);

    let created = 0, updated = 0, deleted = 0;

    for (const gcEvent of allItems) {
      if (gcEvent.status === 'cancelled') { deleted++; continue; }

      const existing = await base44.asServiceRole.entities.Event.filter({
        external_calendar_id: gcEvent.id,
      });

      const startRaw = gcEvent.start?.dateTime || gcEvent.start?.date;
      const endRaw   = gcEvent.end?.dateTime   || gcEvent.end?.date;
      if (!startRaw) continue;

      const isAllDay = !gcEvent.start?.dateTime;
      const startDate = new Date(startRaw);
      const endDate   = endRaw ? new Date(endRaw) : new Date(startDate.getTime() + 3600000);

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
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.Event.update(existing[0].id, eventData);
        updated++;
      } else {
        await base44.asServiceRole.entities.Event.create(eventData);
        created++;
      }
    }

    // Save syncToken for future incremental updates
    if (newSyncToken) {
      const syncRecords = await base44.asServiceRole.entities.SyncState.filter({ service: 'googlecalendar' });
      const syncData = {
        service: 'googlecalendar',
        sync_token: newSyncToken,
        last_synced_at: new Date().toISOString(),
      };
      if (syncRecords.length > 0) {
        await base44.asServiceRole.entities.SyncState.update(syncRecords[0].id, syncData);
      } else {
        await base44.asServiceRole.entities.SyncState.create(syncData);
      }
    }

    return Response.json({ status: 'ok', created, updated, deleted, total: allItems.length });
  } catch (error) {
    console.error('initialGCalSync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});