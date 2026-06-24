import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, fileName, entityType, entityId } = await req.json();

    if (!fileId || !entityType || !entityId) {
      return Response.json({ 
        error: 'Missing required fields: fileId, entityType, entityId' 
      }, { status: 400 });
    }

    // Get Drive access token
    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Get file metadata
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,iconLink`,
      {
        headers: { Authorization: `Bearer ${driveToken}` }
      }
    );

    if (!fileResponse.ok) {
      throw new Error(`Drive API error: ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.json();

    // Create SharedFile entity
    const sharedFile = await base44.entities.SharedFile.create({
      file_name: fileData.name,
      file_url: fileData.webViewLink,
      file_type: fileData.mimeType,
      source: 'google_drive',
      entity_type: entityType,
      entity_id: entityId,
      shared_by: user.email
    });

    console.log(`Attached Drive file "${fileData.name}" to ${entityType} ${entityId}`);

    return Response.json({
      success: true,
      file: sharedFile
    });

  } catch (error) {
    console.error('Attach Drive file error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to attach file'
    }, { status: 500 });
  }
});