import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, keywords } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Get Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Search for relevant files
    const searchQuery = keywords 
      ? keywords.map(k => `fullText contains '${k}'`).join(' or ')
      : '';

    const filesResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&pageSize=10&fields=files(id,name,webViewLink,mimeType)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const filesData = await filesResponse.json();
    const files = filesData.files || [];

    // Get event
    const event = await base44.entities.Event.get(event_id);

    // Attach file links to event notes
    if (files.length > 0) {
      const fileLinks = files.map(f => `- [${f.name}](${f.webViewLink})`).join('\n');
      const updatedNotes = (event.notes || '') + '\n\n**Related Files:**\n' + fileLinks;

      await base44.entities.Event.update(event_id, {
        ...event,
        notes: updatedNotes
      });
    }

    return Response.json({
      success: true,
      files_attached: files.length,
      files: files.map(f => ({ name: f.name, link: f.webViewLink }))
    });

  } catch (error) {
    console.error('Error attaching Drive files:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});