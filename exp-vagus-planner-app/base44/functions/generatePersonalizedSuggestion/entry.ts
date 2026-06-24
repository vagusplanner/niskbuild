import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal_id } = await req.json();

    // Fetch the AI goal
    const goal = await base44.entities.AIPersonalization.get(goal_id);
    if (!goal) {
      return Response.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Get user analysis
    const analysisResponse = await base44.functions.invoke('analyzeUserPersonalization', {});
    const { analysis } = analysisResponse.data;

    // Build personalized context
    let context = `User Goal: ${goal.goal_description}\n\n`;
    context += `User Location: ${analysis.location_context.city || 'Not set'}, ${analysis.location_context.country || 'Not set'}\n\n`;

    if (goal.goal_type === 'sadaqah_recipients') {
      context += `Charity Preferences:\n`;
      context += `- Favorite categories: ${Object.keys(analysis.charity_patterns.favorite_categories).join(', ') || 'None yet'}\n`;
      context += `- Average donation: $${analysis.charity_patterns.avg_donation.toFixed(2)}\n`;
      context += `- Has recurring donations: ${analysis.charity_patterns.recurring_donations > 0 ? 'Yes' : 'No'}\n\n`;
      context += `Task: Suggest specific charitable organizations that match the user's preferences and goal.`;
    } else if (goal.goal_type === 'islamic_events') {
      context += `Islamic Engagement:\n`;
      context += `- Quran reading: ${analysis.islamic_engagement.quran_reading_frequency}\n`;
      context += `- Prayer tracking: ${analysis.islamic_engagement.prayer_tracking ? 'Active' : 'Not active'}\n\n`;
      context += `Task: Suggest upcoming Islamic events, lectures, or community gatherings near the user.`;
    } else if (goal.goal_type === 'hajj_umrah_planning') {
      context += `Planning Context:\n`;
      context += `- Event planning style: ${Object.keys(analysis.event_patterns.common_categories)[0] || 'organized'}\n`;
      context += `- Budget awareness: ${analysis.charity_patterns.avg_donation > 100 ? 'Higher budget' : 'Budget conscious'}\n\n`;
      context += `Task: Provide personalized Hajj/Umrah planning advice including budgeting, timeline, and preparation tips.`;
    } else {
      context += `Task: Provide personalized suggestions based on the user's goal and behavioral patterns.`;
    }

    // Call AI with personalized context
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      add_context_from_internet: goal.goal_type === 'islamic_events' || goal.goal_type === 'sadaqah_recipients',
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                action_url: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          next_steps: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Update last suggestion date
    await base44.entities.AIPersonalization.update(goal_id, {
      last_suggestion_date: new Date().toISOString()
    });

    return Response.json({ 
      goal_type: goal.goal_type,
      suggestions: aiResponse.suggestions,
      next_steps: aiResponse.next_steps,
      personalization_used: true
    });
  } catch (error) {
    console.error('Suggestion generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});