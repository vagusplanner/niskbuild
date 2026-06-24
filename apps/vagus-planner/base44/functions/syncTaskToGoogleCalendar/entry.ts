/**
 * syncTaskToGoogleCalendar
 * Entity automation handler: fires on Task create/update/delete.
 * Pushes tasks with due dates to the user's primary Google Calendar,
 * but only when the user has task_gcal_sync_enabled = true.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const eventType = body.event?.type;
    const taskId = body.event?.entity_id;
    const task = body.data;

    if (!taskId) {
      return Response.json({ status: 'no_task_id' });
    }

    const ownerEmail = task?.created_by || task?.assigned_to;
    if (!ownerEmail) {
      console.log('No owner email on task, skipping');
      return Response.json({ status: 'no_owner' });
    }

    const settingsList = await base44.asServiceRole.entities.UserSettings.list();
    const userSettings = settingsList.find(s => s.created_by === ownerEmail);

    if (!userSettings?.task_gcal_sync_enabled || !userSettings?.google_calendar_connected) {
      console.log('Task GCal sync disabled or not connected for', ownerEmail);
      return Response.json({ status: 'sync_disabled' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    if (eventType === 'delete') {
      const gcalEventId = task?.gcal_event_id;
      if (gcalEventId) {
        const delRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
          { method: 'DELETE', headers: authHeader }
        );
        console.log('Deleted GCal event:', gcalEventId, delRes.status);
      }
      return Response.json({ status: 'deleted' });
    }

    if (!task?.due_date) {
      return Response.json({ status: 'no_due_date' });
    }

    const dueDate = task.due_date;
    const dueTime = task.due_time || '09:00';
    const durationMins = task.estimated_minutes || 30;
    const startDt = new Date(`${dueDate}T${dueTime}:00`);
    const endDt = new Date(startDt.getTime() + durationMins * 60 * 1000);

    const gcalBody = {
      summary: `[Task] ${task.title}`,
      description: [
        task.description || '',
        task.notes ? `Notes: ${task.notes}` : '',
        `Priority: ${task.priority || 'medium'}`,
        `Status: ${task.status || 'todo'}`,
        'Managed by Vagus Planner'
      ].filter(Boolean).join('\n'),
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
      extendedProperties: {
        private: { vagus_task_id: taskId, vagus_source: 'task' }
      }
    };

    const gcalEventId = task?.gcal_event_id;
    let result = null;

    if (gcalEventId && eventType === 'update') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
        { method: 'PUT', headers: authHeader, body: JSON.stringify(gcalBody) }
      );
      if (res.ok) {
        result = await res.json();
        console.log('Updated GCal event:', result.id);
      } else {
        console.warn('GCal update failed, will create:', res.status);
      }
    }

    if (!result) {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', headers: authHeader, body: JSON.stringify(gcalBody) }
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error('GCal create failed:', res.status, errText);
        return Response.json({ error: `GCal create error ${res.status}` });
      }
      result = await res.json();
      console.log('Created GCal event:', result.id);
      await base44.asServiceRole.entities.Task.update(taskId, { gcal_event_id: result.id });
    }

    return Response.json({ status: 'ok', gcal_event_id: result.id });
  } catch (error) {
    console.error('syncTaskToGoogleCalendar error:', error.message);
    return Response.json({ error: error.message }, { status: 200 });
  }
});