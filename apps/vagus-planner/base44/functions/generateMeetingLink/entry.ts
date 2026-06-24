import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, event_title } = await req.json();

    if (type === 'zoom') {
      // Generate Zoom-style meeting link (placeholder - actual Zoom API integration would go here)
      const meetingId = Math.floor(Math.random() * 1000000000);
      return Response.json({
        link: `https://zoom.us/j/${meetingId}`,
        meeting_id: meetingId.toString(),
        type: 'zoom'
      });
    } else if (type === 'meet') {
      // Generate Google Meet link
      const meetCode = Math.random().toString(36).substring(2, 12);
      return Response.json({
        link: `https://meet.google.com/${meetCode}`,
        meeting_code: meetCode,
        type: 'meet'
      });
    } else if (type === 'teams') {
      // Generate Teams-style link (placeholder)
      const meetingId = Math.random().toString(36).substring(2, 15);
      return Response.json({
        link: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
        meeting_id: meetingId,
        type: 'teams'
      });
    }

    return Response.json({ error: 'Invalid meeting type' }, { status: 400 });

  } catch (error) {
    console.error('Meeting link generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});