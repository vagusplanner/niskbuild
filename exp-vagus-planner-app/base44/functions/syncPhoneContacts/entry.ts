import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contacts } = await req.json();

        if (!contacts || !Array.isArray(contacts)) {
            return Response.json({ error: 'Invalid contacts data' }, { status: 400 });
        }

        // Get existing contacts
        const existingContacts = await base44.entities.SocialConnection.filter({
            created_by: user.email
        });

        const existingEmails = new Set(existingContacts.map(c => c.friend_email));
        let syncedCount = 0;
        let updatedCount = 0;

        // Process each contact
        for (const contact of contacts) {
            if (!contact.email) continue;

            const normalizedEmail = contact.email.toLowerCase().trim();
            
            if (existingEmails.has(normalizedEmail)) {
                // Update existing contact
                const existing = existingContacts.find(c => c.friend_email === normalizedEmail);
                if (existing) {
                    await base44.entities.SocialConnection.update(existing.id, {
                        friend_name: contact.name || existing.friend_name,
                        phone_number: contact.phone || existing.phone_number,
                        last_synced: new Date().toISOString()
                    });
                    updatedCount++;
                }
            } else {
                // Create new contact
                await base44.entities.SocialConnection.create({
                    friend_email: normalizedEmail,
                    friend_name: contact.name || normalizedEmail.split('@')[0],
                    phone_number: contact.phone || null,
                    relationship: 'acquaintance',
                    status: 'active',
                    last_synced: new Date().toISOString(),
                    created_by: user.email
                });
                syncedCount++;
            }
        }

        return Response.json({
            success: true,
            synced_count: syncedCount,
            updated_count: updatedCount,
            total_contacts: contacts.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});