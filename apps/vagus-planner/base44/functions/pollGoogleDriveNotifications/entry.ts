import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Google Drive access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

        // Fetch recent file activities
        const response = await fetch(
            'https://www.googleapis.com/drive/v3/changes/startPageToken',
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch Drive notifications');
        }

        const data = await response.json();
        
        // Check for shared files
        const filesResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files?q=sharedWithMe&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,mimeType,modifiedTime,owners,webViewLink)',
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        const filesData = await filesResponse.json();
        const notifications = [];

        // Get last check time (store in user settings or separate entity)
        const settings = await base44.entities.UserSettings.filter({ 
            created_by: user.email 
        });
        const lastCheckTime = settings[0]?.last_drive_check ? new Date(settings[0].last_drive_check) : new Date(Date.now() - 3600000);

        for (const file of filesData.files || []) {
            const fileModifiedTime = file.modifiedTime ? new Date(file.modifiedTime) : null;
            if (fileModifiedTime && fileModifiedTime > lastCheckTime) {
                // Create notification for new/updated shared file
                await base44.functions.invoke('createNotification', {
                    recipient_email: user.email,
                    type: 'drive_file',
                    title: 'New file shared on Drive',
                    message: `${file.owners?.[0]?.displayName || 'Someone'} shared "${file.name}" with you`,
                    source: 'Google Drive',
                    link: file.webViewLink,
                    priority: 'normal',
                    metadata: { file_id: file.id, file_name: file.name }
                });
                notifications.push(file);
            }
        }

        // Update last check time
        if (settings[0]) {
            await base44.asServiceRole.entities.UserSettings.update(settings[0].id, {
                last_drive_check: new Date().toISOString()
            });
        }

        return Response.json({ 
            success: true, 
            notifications_count: notifications.length 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});