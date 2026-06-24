import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onboarding_data } = await req.json();

    // Generate AI-powered personalized recommendations
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this user profile, generate personalized setup recommendations:

User Profile:
- Work Style: ${onboarding_data.work_style}
- Focus Areas: ${onboarding_data.focus_areas.join(', ')}
- Travel Interests: ${onboarding_data.travel_interests.join(', ')}
- Dietary Preferences: ${onboarding_data.dietary_preferences.join(', ')}
- Prayer Enabled: ${onboarding_data.prayer_enabled}
- Location: ${onboarding_data.location_city}, ${onboarding_data.location_country}

Generate:
1. Welcome message (personalized, friendly, 2-3 sentences)
2. Top 3 features they should explore first (with reasons why)
3. Suggested initial calendar setup (optimal work hours, break times)
4. Health tracking recommendations
5. Social connection tips
6. Quick wins (3 actions they can take immediately)
7. Automation suggestions (what to automate based on their profile)

Be specific, actionable, and encouraging.`,
      response_json_schema: {
        type: "object",
        properties: {
          welcome_message: { type: "string" },
          top_features: {
            type: "array",
            items: {
              type: "object",
              properties: {
                feature_name: { type: "string" },
                icon: { type: "string" },
                reason: { type: "string" },
                action_label: { type: "string" },
                page: { type: "string" }
              }
            }
          },
          calendar_setup: {
            type: "object",
            properties: {
              work_hours: {
                type: "object",
                properties: {
                  start: { type: "string" },
                  end: { type: "string" }
                }
              },
              break_times: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: { type: "string" },
                    duration: { type: "number" },
                    type: { type: "string" }
                  }
                }
              },
              focus_blocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    start: { type: "string" },
                    duration: { type: "number" }
                  }
                }
              }
            }
          },
          health_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                suggestion: { type: "string" },
                frequency: { type: "string" }
              }
            }
          },
          social_tips: {
            type: "array",
            items: { type: "string" }
          },
          quick_wins: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                action: { type: "string" }
              }
            }
          },
          automations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                benefit: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create initial setup based on recommendations
    const setupTasks = [];

    // Create default event templates based on focus areas
    if (onboarding_data.focus_areas.includes('work')) {
      setupTasks.push(
        base44.asServiceRole.entities.EventTemplate.create({
          name: 'Deep Work',
          icon: '🎯',
          title: 'Deep Work Session',
          category: 'work',
          duration_minutes: 90,
          reminder_minutes: 15,
          color: '#3b82f6',
          created_by: user.email
        })
      );
    }

    if (onboarding_data.focus_areas.includes('health')) {
      setupTasks.push(
        base44.asServiceRole.entities.EventTemplate.create({
          name: 'Workout',
          icon: '💪',
          title: 'Workout',
          category: 'health',
          duration_minutes: 60,
          reminder_minutes: 30,
          color: '#ef4444',
          created_by: user.email
        })
      );
    }

    if (onboarding_data.prayer_enabled) {
      setupTasks.push(
        base44.asServiceRole.entities.EventTemplate.create({
          name: 'Prayer Time',
          icon: '🕌',
          title: 'Prayer',
          category: 'spiritual',
          duration_minutes: 15,
          reminder_minutes: 5,
          color: '#8b5cf6',
          created_by: user.email
        })
      );
    }

    await Promise.all(setupTasks);

    return Response.json({
      success: true,
      recommendations: response
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});