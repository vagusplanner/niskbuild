import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_id, transcript, action } = await req.json();
    
    // action can be: 'transcribe', 'analyze', 'schedule_followups'

    if (action === 'transcribe') {
      // Get meeting details
      const meeting = await base44.entities.Meeting.list();
      const targetMeeting = meeting.find(m => m.id === meeting_id);
      
      if (!targetMeeting) {
        return Response.json({ error: 'Meeting not found' }, { status: 404 });
      }

      // Use AI to generate transcript simulation (in real implementation, this would use voice-to-text API)
      const transcriptText = transcript || `Meeting discussion for: ${targetMeeting.title}`;

      return Response.json({
        success: true,
        transcript: transcriptText,
        meeting_id
      });
    }

    if (action === 'analyze') {
      if (!transcript) {
        return Response.json({ error: 'Transcript required for analysis' }, { status: 400 });
      }

      // Get meeting details
      const meetings = await base44.entities.Meeting.list();
      const targetMeeting = meetings.find(m => m.id === meeting_id);

      // Use AI to analyze the transcript
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this meeting transcript and extract key information:

Meeting: ${targetMeeting?.title || 'Meeting'}
Transcript: ${transcript}

Extract:
1. Key discussion points (max 5)
2. Action items with assigned person if mentioned
3. Decisions made
4. Follow-up items needed
5. Sentiment/tone of the meeting

Be concise and structured.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            discussion_points: {
              type: "array",
              items: { type: "string" }
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  assigned_to: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  due_date: { type: "string" }
                }
              }
            },
            decisions: {
              type: "array",
              items: { type: "string" }
            },
            follow_ups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  suggested_date: { type: "string" }
                }
              }
            },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] }
          }
        }
      });

      // Update meeting with AI summary
      if (targetMeeting) {
        await base44.entities.Meeting.update(meeting_id, {
          ai_summary: JSON.stringify(analysis),
          outcome_notes: analysis.summary,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }

      return Response.json({
        success: true,
        analysis,
        meeting_id
      });
    }

    if (action === 'send_followup_email') {
      const meetings = await base44.entities.Meeting.list();
      const targetMeeting = meetings.find(m => m.id === meeting_id);
      
      if (!targetMeeting?.ai_summary) {
        return Response.json({ error: 'Meeting analysis not found' }, { status: 404 });
      }

      const analysis = JSON.parse(targetMeeting.ai_summary);
      
      // Generate professional follow-up email
      const emailContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional follow-up email for this meeting:

Meeting: ${targetMeeting.title}
Date: ${targetMeeting.confirmed_date || 'Recent'}
Summary: ${analysis.summary}

Key Decisions:
${analysis.decisions?.map((d, i) => `${i + 1}. ${d}`).join('\n') || 'None'}

Action Items:
${analysis.action_items?.map((item, i) => `${i + 1}. ${item.task} - Assigned to: ${item.assigned_to || 'TBD'} - Priority: ${item.priority} - Due: ${item.due_date || 'TBD'}`).join('\n') || 'None'}

Follow-up Meetings Needed:
${analysis.follow_ups?.map((f, i) => `${i + 1}. ${f.topic} - Suggested: ${f.suggested_date}`).join('\n') || 'None'}

Create a concise, professional email summarizing the above. Include:
- Brief recap
- Key decisions made
- Action items with owners and deadlines
- Next steps and follow-up meetings

Keep it clear and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      // Send email to all attendees
      const attendees = targetMeeting.attendees || [];
      const emailPromises = attendees.map(attendee => 
        base44.integrations.Core.SendEmail({
          to: attendee,
          subject: emailContent.subject,
          body: emailContent.body
        })
      );

      await Promise.all(emailPromises);

      return Response.json({
        success: true,
        recipients_count: attendees.length,
        email: emailContent
      });
    }

    if (action === 'schedule_followups') {
      const meetings = await base44.entities.Meeting.list();
      const targetMeeting = meetings.find(m => m.id === meeting_id);
      
      if (!targetMeeting?.ai_summary) {
        return Response.json({ error: 'Meeting analysis not found' }, { status: 404 });
      }

      const analysis = JSON.parse(targetMeeting.ai_summary);
      const createdItems = [];

      // Create tasks from action items
      for (const item of analysis.action_items || []) {
        const task = await base44.entities.Task.create({
          title: item.task,
          description: `Action item from meeting: ${targetMeeting.title}`,
          priority: item.priority || 'medium',
          status: 'todo',
          due_date: item.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'work',
          assigned_to: item.assigned_to || user.email
        });
        createdItems.push({ type: 'task', data: task });
      }

      // Create follow-up meetings
      for (const followUp of analysis.follow_ups || []) {
        const suggestedDate = new Date(followUp.suggested_date || Date.now() + 14 * 24 * 60 * 60 * 1000);
        
        const followUpMeeting = await base44.entities.Meeting.create({
          title: `Follow-up: ${followUp.topic}`,
          description: `Follow-up discussion from: ${targetMeeting.title}`,
          organizer_email: user.email,
          attendees: targetMeeting.attendees || [],
          duration_minutes: 30,
          proposed_times: [{
            date: suggestedDate.toISOString().split('T')[0],
            start_time: '14:00',
            end_time: '14:30'
          }],
          status: 'pending'
        });
        
        createdItems.push({ type: 'meeting', data: followUpMeeting });
      }

      return Response.json({
        success: true,
        created: createdItems,
        tasks_created: createdItems.filter(i => i.type === 'task').length,
        meetings_created: createdItems.filter(i => i.type === 'meeting').length
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('AI Meeting Assistant error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});