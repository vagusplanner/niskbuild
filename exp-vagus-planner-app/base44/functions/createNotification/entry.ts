import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            recipient_email, 
            type, 
            title, 
            message, 
            source, 
            link, 
            priority = 'normal',
            metadata = {}
        } = await req.json();

        if (!recipient_email || !type || !title || !message) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create notification
        const notification = await base44.asServiceRole.entities.Notification.create({
            recipient_email,
            type,
            title,
            message,
            source,
            link,
            priority,
            metadata,
            is_read: false
        });

        // Send push notification if supported
        try {
            await base44.integrations.Core.SendEmail({
                to: recipient_email,
                subject: `🔔 ${title}`,
                body: `${message}\n\n${link ? `View: ${link}` : ''}`
            });
        } catch (emailError) {
            console.log('Email notification failed:', emailError.message);
        }

        return Response.json({ 
            success: true, 
            notification 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});