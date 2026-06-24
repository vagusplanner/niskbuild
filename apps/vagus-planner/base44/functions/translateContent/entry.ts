import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, target_language, source_language = 'auto' } = await req.json();

        if (!text || !target_language) {
            return Response.json({ error: 'Missing required fields: text, target_language' }, { status: 400 });
        }

        // Use AI to translate
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Translate the following text ${source_language === 'auto' ? '' : `from ${source_language} `}to ${target_language}.

Text to translate:
"""
${text}
"""

Instructions:
- Provide ONLY the translated text, no explanations
- Preserve formatting (line breaks, bullet points, etc.)
- Keep any proper nouns, names, or technical terms if appropriate
- Maintain the tone and style of the original text`,
            add_context_from_internet: false
        });

        return Response.json({
            success: true,
            translated_text: response.trim(),
            source_language,
            target_language
        });

    } catch (error) {
        console.error('Translation error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});