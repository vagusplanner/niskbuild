import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_preferences } = await req.json();
    
    // Build AI prompt based on user preferences
    const prompt = `As a UX designer, suggest the best calendar theme for a user based on their preferences:
    
Current preferences:
- Font: ${user_preferences.font}
- Layout density: ${user_preferences.density}
- Current theme: ${user_preferences.current_theme}

Available themes:
1. Ocean Breeze (default) - Calming teal and cyan colors
2. Warm Sunset (sunset) - Energetic orange and pink
3. Forest Green (forest) - Natural green tones
4. Lavender Dreams (lavender) - Soft purple and indigo
5. Midnight Blue (midnight) - Professional dark blues
6. Rose Garden (rose) - Romantic rose and red

Based on optimal readability, user comfort, and their current settings, which theme would you recommend?

Respond with ONLY the theme ID (default, sunset, forest, lavender, midnight, or rose) and a brief one-sentence explanation.`;

    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          theme_id: { type: "string" },
          explanation: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      suggested_theme_id: data.theme_id,
      message: data.explanation
    });
    
  } catch (error) {
    console.error('Error suggesting theme:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});