import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gmailToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    
    // Search for emails with event-related keywords
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=meeting OR conference OR event OR appointment OR scheduled OR 2026&maxResults=20`,
      { headers: { Authorization: `Bearer ${gmailToken}` } }
    );
    
    const data = await response.json();
    const messageIds = data.messages?.map(m => m.id) || [];
    
    const detectedEvents = [];
    
    for (const messageId of messageIds.slice(0, 5)) {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${gmailToken}` } }
      );
      
      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      // Simple extraction - in production would use more sophisticated NLP
      if (subject && (subject.includes('meeting') || subject.includes('event') || subject.includes('call'))) {
        detectedEvents.push({
          title: subject.substring(0, 100),
          from,
          date,
          messageId,
          suggestion: `Add "${subject}" to calendar?`
        });
      }
    }
    
    return Response.json({ detectedEvents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});