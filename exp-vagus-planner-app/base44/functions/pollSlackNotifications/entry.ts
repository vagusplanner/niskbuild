import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Slack access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('slack');

        // Fetch recent conversations
        const conversationsResponse = await fetch(
            'https://slack.com/api/conversations.list?types=public_channel,private_channel,im&limit=20',
            {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }
        );

        const conversationsData = await conversationsResponse.json();
        const notifications = [];

        if (!conversationsData.ok) {
            throw new Error(conversationsData.error || 'Failed to fetch Slack conversations');
        }

        // Get last check time
        const settings = await base44.entities.UserSettings.filter({ 
            created_by: user.email 
        });
        const lastCheck = settings[0]?.last_slack_check || Date.now() / 1000 - 3600;

        // Check each conversation for new messages
        for (const channel of conversationsData.channels || []) {
            const historyResponse = await fetch(
                `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${lastCheck}&limit=10`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );

            const historyData = await historyResponse.json();

            if (historyData.ok && historyData.messages && historyData.messages.length > 0) {
                for (const message of historyData.messages) {
                    // Don't notify about own messages
                    if (message.user && message.text) {
                        await base44.functions.invoke('createNotification', {
                            recipient_email: user.email,
                            type: 'slack_message',
                            title: `New Slack message in #${channel.name || 'channel'}`,
                            message: message.text.substring(0, 150) + (message.text.length > 150 ? '...' : ''),
                            source: `Slack - #${channel.name}`,
                            link: `https://slack.com/app_redirect?channel=${channel.id}`,
                            priority: message.text.includes('@channel') || message.text.includes('@here') ? 'high' : 'normal',
                            metadata: { 
                                channel_id: channel.id, 
                                channel_name: channel.name,
                                message_ts: message.ts 
                            }
                        });
                        notifications.push(message);
                    }
                }
            }
        }

        // Update last check time
        if (settings[0]) {
            await base44.asServiceRole.entities.UserSettings.update(settings[0].id, {
                last_slack_check: Date.now() / 1000
            });
        } else {
            await base44.asServiceRole.entities.UserSettings.create({
                last_slack_check: Date.now() / 1000,
                created_by: user.email
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