import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      attendees, 
      location,
      timezone = 'UTC'
    } = await req.json();

    if (!title || !startTime || !endTime || !attendees || attendees.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the meeting in database
    const meeting = await base44.entities.Meeting.create({
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      location,
      status: 'scheduled',
      attendees: attendees.join(',')
    });

    // Create calendar event for organizer
    const event = await base44.entities.Event.create({
      title,
      description,
      start_date: startTime,
      end_date: endTime,
      location,
      category: 'work',
      is_all_day: false
    });

    // Send email invites to all attendees
    const emailPromises = attendees.map(async (email) => {
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">📅 Meeting Invitation</h2>
          
          <div style="background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${title}</h3>
            <p><strong>When:</strong> ${startDate.toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
            <p><strong>Duration:</strong> ${Math.round((endDate - startDate) / 60000)} minutes</p>
            ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            ${description ? `<p><strong>Details:</strong> ${description}</p>` : ''}
          </div>
          
          <p><strong>Organizer:</strong> ${user.email}</p>
          
          <div style="margin-top: 30px;">
            <p style="color: #64748b; font-size: 14px;">
              This meeting has been added to your calendar. 
              You will receive a reminder before the meeting starts.
            </p>
          </div>
        </div>
      `;

      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'MyAssistant Calendar',
          to: email,
          subject: `Meeting Invitation: ${title}`,
          body: emailBody
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    });

    await Promise.allSettled(emailPromises);

    // Send notifications
    for (const email of attendees) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          created_by: email,
          type: 'event_conflict',
          title: 'New Meeting Invitation',
          message: `${user.full_name || user.email} invited you to: ${title}`,
          action_url: `/Calendar?event=${event.id}`,
          scheduled_time: new Date().toISOString()
        });
      } catch (notifError) {
        console.error(`Failed to create notification for ${email}:`, notifError);
      }
    }

    return Response.json({
      success: true,
      meeting_id: meeting.id,
      event_id: event.id,
      invites_sent: attendees.length,
      message: 'Meeting invites sent successfully'
    });
  } catch (error) {
    console.error('Error sending invites:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});