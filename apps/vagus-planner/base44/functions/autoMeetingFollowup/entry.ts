import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get meetings that ended in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const recentMeetings = await base44.entities.Meeting.filter({
      confirmed_date: yesterdayStr,
      status: 'confirmed',
      organizer_email: user.email
    });

    const followups = [];

    for (const meeting of recentMeetings) {
      // Check if follow-up already sent
      const existingTasks = await base44.entities.Task.filter({
        title: `Follow-up: ${meeting.title}`
      });

      if (existingTasks.length === 0) {
        // Create follow-up task
        const task = await base44.entities.Task.create({
          title: `Follow-up: ${meeting.title}`,
          description: `Send meeting notes and action items to attendees`,
          category: 'work',
          priority: 'high',
          due_date: new Date().toISOString().split('T')[0],
          notes: `Meeting attendees: ${meeting.attendees?.join(', ') || 'N/A'}`
        });

        followups.push({
          meeting: meeting.title,
          task_id: task.id
        });

        // Send email notification to organizer
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `Follow-up needed: ${meeting.title}`,
          body: `Hi ${user.full_name || user.email},

Your meeting "${meeting.title}" from ${meeting.confirmed_date} requires a follow-up.

Please send meeting notes and action items to:
${meeting.attendees?.join('\n') || 'No attendees listed'}

A task has been created in your calendar to track this.

Best regards,
Your AI Assistant`
        });
      }
    }

    return Response.json({
      processed: recentMeetings.length,
      followups_created: followups.length,
      details: followups
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});