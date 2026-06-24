import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversation_id, group_chat_id, tone = 'professional', length = 'medium' } = await req.json();

        if (!conversation_id && !group_chat_id) {
            return Response.json({ error: 'Conversation ID required' }, { status: 400 });
        }

        // Get conversation history
        let messages = [];
        if (conversation_id) {
            messages = await base44.entities.Chat.filter({ conversation_id });
        } else {
            messages = await base44.entities.GroupMessage.filter({ group_chat_id });
        }

        // Sort by date
        messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        // Get last 10 messages for context
        const recentMessages = messages.slice(-10);

        // Get user's past messages for style matching
        const userPastMessages = messages
            .filter(m => m.sender_email === user.email)
            .slice(-20);

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Draft a response to this conversation based on the context and user's communication style:

Recent conversation:
${recentMessages.map(m => `${m.sender_name}: ${m.message}`).join('\n')}

User's typical communication style (from past messages):
${userPastMessages.map(m => m.message).join('\n')}

Generate ${length} length response in ${tone} tone that:
1. Addresses the most recent message appropriately
2. Maintains the user's natural communication style
3. Is contextually relevant and helpful
4. Includes appropriate pleasantries if needed

Provide 3 different response options with varying approaches.`,
            response_json_schema: {
                type: "object",
                properties: {
                    responses: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                message: { type: "string" },
                                approach: { type: "string" },
                                confidence: { type: "number" }
                            }
                        }
                    },
                    context_summary: { type: "string" }
                }
            }
        });

        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});