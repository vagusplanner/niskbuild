import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Gmail access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        // Fetch recent emails (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const query = `after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`;
        
        const messagesResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!messagesResponse.ok) {
            const error = await messagesResponse.text();
            return Response.json({ error: 'Failed to fetch emails', details: error }, { status: 500 });
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData.messages || [];

        // Get existing events to avoid duplicates
        const existingEvents = await base44.entities.Event.list();
        
        let createdCount = 0;
        const processedEmails = [];

        // Process each email
        for (const message of messages.slice(0, 20)) { // Limit to 20 emails per sync
            try {
                // Get full email content
                const emailResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!emailResponse.ok) continue;

                const emailData = await emailResponse.json();
                
                // Extract email details
                const headers = emailData.payload.headers;
                const subject = headers.find(h => h.name === 'Subject')?.value || '';
                const from = headers.find(h => h.name === 'From')?.value || '';
                
                // Get email body
                let body = '';
                if (emailData.payload.body?.data) {
                    body = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                } else if (emailData.payload.parts) {
                    const textPart = emailData.payload.parts.find(p => p.mimeType === 'text/plain');
                    if (textPart?.body?.data) {
                        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                }

                // Skip if email already processed (check if event with this email ID exists)
                const alreadyProcessed = existingEvents.some(e => 
                    e.notes && e.notes.includes(`email:${message.id}`)
                );
                if (alreadyProcessed) continue;

                // Use LLM to extract scheduling information
                const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Analyze this email and extract any scheduling information (meetings, flights, appointments, reservations, etc.).

Email Subject: ${subject}
Email From: ${from}
Email Body (first 2000 chars): ${body.slice(0, 2000)}

If this email contains scheduling information, extract:
- Event title
- Date (in YYYY-MM-DD format)
- Start time (HH:MM format) if available
- End time (HH:MM format) if available
- Location if mentioned
- Category (work, personal, health, family, social, other)
- Whether it's all day event
- Brief description

Return null if this is NOT a scheduling-related email (no meetings, flights, appointments, reservations, events).`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            has_scheduling_info: { type: "boolean" },
                            event: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    date: { type: "string" },
                                    start_time: { type: "string" },
                                    end_time: { type: "string" },
                                    location: { type: "string" },
                                    category: { type: "string" },
                                    is_all_day: { type: "boolean" },
                                    description: { type: "string" }
                                }
                            }
                        }
                    }
                });

                // Create event if scheduling info found
                if (llmResponse.has_scheduling_info && llmResponse.event?.title && llmResponse.event?.date) {
                    // Build start_date and end_date in proper format
                    const eventDate = llmResponse.event.date; // YYYY-MM-DD
                    const startTime = llmResponse.event.start_time || '09:00';
                    const endTime = llmResponse.event.end_time || '10:00';
                    
                    const eventData = {
                        title: llmResponse.event.title,
                        start_date: `${eventDate}T${startTime}:00`,
                        end_date: `${eventDate}T${endTime}:00`,
                        is_all_day: llmResponse.event.is_all_day || false,
                        location: llmResponse.event.location || '',
                        category: llmResponse.event.category || 'other',
                        description: llmResponse.event.description || '',
                        notes: `Auto-imported from email\nFrom: ${from}\nSubject: ${subject}\nemail:${message.id}`,
                        created_by: user.email
                    };

                    await base44.asServiceRole.entities.Event.create(eventData);
                    createdCount++;
                    processedEmails.push({
                        subject: subject,
                        from: from,
                        eventTitle: eventData.title
                    });
                }
            } catch (error) {
                console.error('Error processing email:', error);
                continue;
            }
        }

        return Response.json({ 
            success: true, 
            created: createdCount,
            total_emails_scanned: messages.length,
            processed_emails: processedEmails
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});