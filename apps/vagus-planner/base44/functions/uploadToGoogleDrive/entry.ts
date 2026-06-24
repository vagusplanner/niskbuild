import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handle file upload to Google Drive
 * Note: In production, use resumable uploads for large files
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      file_name,
      file_size,
      file_type,
      event_id
    } = await req.json();

    if (!file_name) {
      return Response.json(
        { error: 'Missing file_name' },
        { status: 400 }
      );
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create or get the MyAssistant Events folder
    const folderResponse = await createEventFolder(accessToken);
    const folderId = folderResponse.id;

    // Create metadata for the file
    const metadata = {
      name: file_name,
      mimeType: file_type || 'application/octet-stream',
      parents: [folderId],
      description: `Event: ${event_id || 'General'}`,
      properties: {
        app: 'myassistant',
        event_id: event_id
      }
    };

    // For now, create a placeholder file
    // In production, you'd stream the actual file content
    const content = `File: ${file_name}\nSize: ${file_size} bytes\nType: ${file_type}`;

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'text/plain' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return Response.json(
        { 
          success: false,
          error: error.error?.message || 'Failed to upload to Google Drive'
        },
        { status: response.status }
      );
    }

    const fileData = await response.json();

    // Log the action
    try {
      await base44.asServiceRole.entities.SharedFile?.create?.({
        user_email: user.email,
        file_name: file_name,
        file_type: file_type,
        event_id: event_id,
        storage_type: 'google_drive',
        external_file_id: fileData.id,
        external_file_url: fileData.webViewLink,
        created_at: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to log file share:', err);
    }

    return Response.json({
      success: true,
      file_id: fileData.id,
      file_name: fileData.name,
      web_link: fileData.webViewLink,
      mime_type: fileData.mimeType
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

/**
 * Create or get the MyAssistant Events folder
 */
async function createEventFolder(accessToken) {
  const folderName = 'MyAssistant Events';

  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false&spaces=drive&fields=files(id)`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  // Create new folder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      })
    }
  );

  return await createResponse.json();
}