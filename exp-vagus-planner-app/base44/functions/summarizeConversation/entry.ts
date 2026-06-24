import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            conversation_id, 
            group_chat_id, 
            file_url, 
            text_content,
            summary_type = 'comprehensive' 
        } = await req.json();

        let contentToSummarize = text_content || '';

        // Get chat history if provided
        if (conversation_id || group_chat_id) {
            let messages = [];
            if (conversation_id) {
                messages = await base44.entities.Chat.filter({ conversation_id });
            } else {
                messages = await base44.entities.GroupMessage.filter({ group_chat_id });
            }

            messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            contentToSummarize = messages.map(m => 
                `${m.sender_name} (${new Date(m.created_date).toLocaleString()}): ${m.message}`
            ).join('\n\n');
        }

        // Fetch file content if URL provided
        if (file_url) {
            const fileResponse = await fetch(file_url);
            contentToSummarize = await fileResponse.text();
        }

        if (!contentToSummarize) {
            return Response.json({ error: 'No content to summarize' }, { status: 400 });
        }

        // Determine prompt based on summary type
        let prompt = '';
        let schema = {};

        if (summary_type === 'comprehensive') {
            prompt = `Provide a comprehensive summary of the following content:

${contentToSummarize.substring(0, 15000)}

Include:
1. Main topics discussed
2. Key decisions or action items
3. Important dates or deadlines mentioned
4. Participant contributions (if applicable)
5. Overall sentiment and tone`;

            schema = {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    main_topics: {
                        type: "array",
                        items: { type: "string" }
                    },
                    action_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                owner: { type: "string" },
                                deadline: { type: "string" }
                            }
                        }
                    },
                    key_decisions: {
                        type: "array",
                        items: { type: "string" }
                    },
                    sentiment: { type: "string" }
                }
            };
        } else if (summary_type === 'quick') {
            prompt = `Provide a quick 2-3 sentence summary of this content:

${contentToSummarize.substring(0, 10000)}`;

            schema = {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    key_point: { type: "string" }
                }
            };
        }

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: schema
        });

        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});