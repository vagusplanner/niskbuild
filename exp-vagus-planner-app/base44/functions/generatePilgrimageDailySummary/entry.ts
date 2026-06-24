import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      day_date, 
      rituals_completed = [], 
      activities = [], 
      reflections = "",
      challenges_faced = [],
      health_status = "good",
      emotional_state = "inspired"
    } = await req.json();

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate an inspiring and meaningful daily summary of pilgrimage activities for a pilgrim.

Day Date: ${day_date}
Rituals Completed: ${rituals_completed.join(', ') || 'none yet'}
Activities: ${activities.join(', ') || 'none recorded'}
Pilgrim's Reflections: "${reflections || 'not provided'}"
Challenges Faced: ${challenges_faced.join(', ') || 'none noted'}
Health Status: ${health_status}
Emotional State: ${emotional_state}

Create a comprehensive daily summary with this structure:
{
  "date": "${day_date}",
  "day_title": "Meaningful title for this day",
  "achievements": [
    {
      "ritual_or_activity": "name",
      "significance": "why this was important",
      "experience_summary": "what the pilgrim went through"
    }
  ],
  "spiritual_reflection": "Thoughtful reflection on the day's spiritual journey",
  "challenges_and_lessons": [
    {
      "challenge": "what happened",
      "lesson_learned": "what this teaches about faith/perseverance",
      "advice_for_next_time": "constructive advice"
    }
  ],
  "highlights": ["key moments from the day"],
  "emotional_journey": "Summary of emotional growth or challenges",
  "health_and_wellness": {
    "status_summary": "overview of physical wellbeing",
    "recommendations": ["suggestions for next day"],
    "rest_needed": "how much rest is important"
  },
  "progress_report": {
    "rituals_completed": number,
    "total_day_duration": "estimated duration of activities",
    "connection_to_the_sacred": "level of spiritual connection",
    "overall_progress": "percentage of pilgrimage completed"
  },
  "gratitude_reminder": "Inspiring message about gratitude",
  "next_day_preparation": "What to prepare mentally and physically for tomorrow",
  "duas_for_reflection": [
    {
      "occasion": "when to recite",
      "dua": "suggested dua for reflection",
      "reason": "why this dua is relevant today"
    }
  ],
  "memory_prompt": "Suggestion for what to remember from this day"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          date: { type: "string" },
          day_title: { type: "string" },
          achievements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ritual_or_activity: { type: "string" },
                significance: { type: "string" },
                experience_summary: { type: "string" }
              }
            }
          },
          spiritual_reflection: { type: "string" },
          challenges_and_lessons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                challenge: { type: "string" },
                lesson_learned: { type: "string" },
                advice_for_next_time: { type: "string" }
              }
            }
          },
          highlights: { type: "array", items: { type: "string" } },
          emotional_journey: { type: "string" },
          health_and_wellness: {
            type: "object",
            properties: {
              status_summary: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
              rest_needed: { type: "string" }
            }
          },
          progress_report: {
            type: "object",
            properties: {
              rituals_completed: { type: "number" },
              total_day_duration: { type: "string" },
              connection_to_the_sacred: { type: "string" },
              overall_progress: { type: "string" }
            }
          },
          gratitude_reminder: { type: "string" },
          next_day_preparation: { type: "string" },
          duas_for_reflection: {
            type: "array",
            items: {
              type: "object",
              properties: {
                occasion: { type: "string" },
                dua: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          memory_prompt: { type: "string" }
        }
      }
    });

    return Response.json({
      date: day_date,
      ...summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily summary generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});