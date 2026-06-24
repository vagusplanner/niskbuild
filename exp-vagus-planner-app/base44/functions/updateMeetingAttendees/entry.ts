import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_id, update_type, message } = await req.json();

    if (!meeting_id || !update_type) {
      return Response.json({ error: 'Missing meeting_id or update_type' }, { status: 400 });
    }

    // Fetch meeting details
    const meetings = await base44.entities.Meeting.filter({ id: meeting_id });
    if (meetings.length === 0) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const meeting = meetings[0];
    const attendees = meeting.attendees ? meeting.attendees.split(',') : [];

    // Determine update message
    let emailSubject = '';
    let emailContent = '';

    switch (update_type) {
      case 'time_changed':
        emailSubject = `Meeting Time Changed: ${meeting.title}`;
        emailContent = `
          <h3 style="color: #14b8a6;">⏰ Meeting Time Updated</h3>
          <p>The time for <strong>${meeting.title}</strong> has been changed.</p>
          <p><strong>New Time:</strong> ${new Date(meeting.start_time).toLocaleString()}</p>
          ${message ? `<p><strong>Note from organizer:</strong> ${message}</p>` : ''}
        `;
        break;
      
      case 'location_changed':
        emailSubject = `Meeting Location Changed: ${meeting.title}`;
        emailContent = `
          <h3 style="color: #14b8a6;">📍 Meeting Location Updated</h3>
          <p>The location for <strong>${meeting.title}</strong> has been changed.</p>
          <p><strong>New Location:</strong> ${meeting.location || 'TBD'}</p>
          ${message ? `<p><strong>Note from organizer:</strong> ${message}</p>` : ''}
        `;
        break;
      
      case 'cancelled':
        emailSubject = `Meeting Cancelled: ${meeting.title}`;
        emailContent = `
          <h3 style="color: #ef4444;">❌ Meeting Cancelled</h3>
          <p>The meeting <strong>${meeting.title}</strong> scheduled for ${new Date(meeting.start_time).toLocaleString()} has been cancelled.</p>
          ${message ? `<p><strong>Reason:</strong> ${message}</p>` : ''}
        `;
        break;
      
      default:
        emailSubject = `Meeting Update: ${meeting.title}`;
        emailContent = `
          <h3 style="color: #14b8a6;">📝 Meeting Updated</h3>
          <p>There's been an update to <strong>${meeting.title}</strong></p>
          ${message ? `<p>${message}</p>` : ''}
        `;
    }

    // Send update emails to all attendees
    const emailPromises = attendees.map(async (email) => {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'MyAssistant Calendar',
          to: email.trim(),
          subject: emailSubject,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${emailContent}
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px;">
                  Meeting Details:<br>
                  <strong>When:</strong> ${new Date(meeting.start_time).toLocaleString()}<br>
                  ${meeting.location ? `<strong>Where:</strong> ${meeting.location}<br>` : ''}
                  <strong>Organizer:</strong> ${user.email}
                </p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error(`Failed to send update to ${email}:`, emailError);
      }
    });

    await Promise.allSettled(emailPromises);

    // Create notifications
    for (const email of attendees) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          created_by: email.trim(),
          type: 'system',
          title: emailSubject,
          message: message || 'Meeting has been updated',
          scheduled_time: new Date().toISOString()
        });
      } catch (notifError) {
        console.error(`Failed to create notification for ${email}:`, notifError);
      }
    }

    return Response.json({
      success: true,
      updates_sent: attendees.length,
      message: 'Meeting updates sent to all attendees'
    });
  } catch (error) {
    console.error('Error updating attendees:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});