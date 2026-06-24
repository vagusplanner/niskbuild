import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Import from Google Calendar
        const importResult = await base44.functions.invoke('syncFromGoogleCalendar', {});
        
        // Export to Google Calendar
        const exportResult = await base44.functions.invoke('syncToGoogleCalendar', {});

        return Response.json({ 
            success: true,
            imported: importResult.data.imported || 0,
            exported: exportResult.data.exported || 0
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});