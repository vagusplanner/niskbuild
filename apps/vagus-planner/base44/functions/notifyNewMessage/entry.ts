import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { event, data } = await req.json();

        if (!event || !data) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Skip if message was just created by this automation
        if (data.created_date && Date.now() - new Date(data.created_date).getTime() > 5000) {
            return Response.json({ success: true, skipped: true });
        }

        // Determine recipients based on message type
        let recipients = [];
        let notificationType = 'chat_message';
        let title = 'New message';
        let source = data.sender_name || data.sender_email;

        if (event.entity_name === 'Chat') {
            // Direct message - notify the other person
            const convId = data.conversation_id;
            const emails = convId.split('_').filter(e => e.includes('@'));
            recipients = emails.filter(email => email !== data.sender_email);
            title = `New message from ${data.sender_name || data.sender_email}`;
        } else if (event.entity_name === 'GroupMessage') {
            // Group message - notify all members except sender
            const groupChat = await base44.asServiceRole.entities.GroupChat.get(data.group_chat_id);
            if (groupChat && groupChat.members) {
                recipients = groupChat.members.filter(email => email !== data.sender_email);
                title = `New message in ${groupChat.name}`;
                source = `${data.sender_name} in ${groupChat.name}`;
                notificationType = 'group_message';
            }
        }

        // Check for mentions
        const mentions = data.message?.match(/@(\w+)/g) || [];
        if (mentions.length > 0) {
            notificationType = 'mention';
            title = `${data.sender_name} mentioned you`;
        }

        // Create notifications for each recipient
        for (const recipient of recipients) {
            await base44.functions.invoke('createNotification', {
                recipient_email: recipient,
                type: notificationType,
                title,
                message: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
                source,
                link: `/Chat`,
                priority: notificationType === 'mention' ? 'high' : 'normal',
                metadata: {
                    message_id: data.id,
                    sender_email: data.sender_email,
                    conversation_id: data.conversation_id || data.group_chat_id
                }
            });
        }

        return Response.json({ 
            success: true, 
            notifications_sent: recipients.length 
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});