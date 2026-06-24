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

    // Fetch recent Gmail senders (people you've emailed with) using Gmail API
    // We fetch sent messages to extract recipient emails as contacts
    const messagesResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=200&labelIds=SENT',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!messagesResponse.ok) {
      const errText = await messagesResponse.text();
      throw new Error(`Failed to fetch Gmail messages: ${errText}`);
    }

    const messagesData = await messagesResponse.json();
    const messageList = messagesData.messages || [];

    // Extract unique email addresses from message headers
    const contactMap = new Map();

    // Process messages in batches to extract To/CC headers
    const batchSize = 20;
    for (let i = 0; i < Math.min(messageList.length, 100); i += batchSize) {
      const batch = messageList.slice(i, i + batchSize);
      await Promise.all(batch.map(async (msg) => {
        try {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=To&metadataHeaders=From`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );
          if (!msgResponse.ok) return;
          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];
          
          for (const header of headers) {
            if (header.name === 'To' || header.name === 'From') {
              // Parse email addresses from header value like "Name <email@example.com>"
              const matches = header.value.match(/([^<,\s]+@[^>,\s]+)/g) || [];
              const nameMatch = header.value.match(/^([^<]+)</);
              const name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : null;
              
              for (const email of matches) {
                const normalizedEmail = email.toLowerCase().trim();
                if (!contactMap.has(normalizedEmail) && normalizedEmail !== user.email) {
                  contactMap.set(normalizedEmail, {
                    email: normalizedEmail,
                    name: name || normalizedEmail.split('@')[0]
                  });
                }
              }
            }
          }
        } catch (e) {
          // ignore individual message errors
        }
      }));
    }

    const contacts = Array.from(contactMap.values());

    // Fetch existing contacts in one call
    const existingContacts = await base44.entities.SocialConnection.filter({ created_by: user.email });
    const existingEmails = new Set(existingContacts.map(c => c.friend_email?.toLowerCase()));

    let newCount = 0;
    for (const contact of contacts) {
      if (!existingEmails.has(contact.email)) {
        await base44.asServiceRole.entities.SocialConnection.create({
          friend_email: contact.email,
          friend_name: contact.name,
          relationship: 'acquaintance',
          status: 'active',
          created_by: user.email
        });
        newCount++;
      }
    }

    return Response.json({
      success: true,
      synced_count: newCount,
      total_found: contacts.length,
      message: newCount === 0 ? 'All contacts already synced' : `Added ${newCount} new contacts`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});