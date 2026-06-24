import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's activity data
    const [userSettings, tasks, events, userPoints] = await Promise.all([
      base44.entities.UserSettings.filter({ created_by: user.email }),
      base44.entities.Task.filter({ created_by: user.email }),
      base44.entities.Event.filter({ created_by: user.email }),
      base44.entities.GamificationPoints.filter({ created_by: user.email })
    ]);

    const settings = userSettings[0] || {};
    const points = userPoints[0] || { current_level: 1 };

    // Count recent activity
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentTasks = tasks.filter(t => new Date(t.created_date) > weekAgo);
    const recentEvents = events.filter(e => new Date(e.created_date) > weekAgo);

    // Generate AI-powered challenges
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 5 personalized challenges for a user based on their profile and activity:

User Profile:
- Level: ${points.current_level}
- Focus Areas: ${settings.focus_areas?.join(', ') || 'Not set'}
- Work Style: ${settings.work_style || 'Not set'}
- Tasks completed this week: ${recentTasks.length}
- Events created this week: ${recentEvents.length}
- Prayer times enabled: ${settings.prayer_enabled || false}
- Health tracking enabled: ${settings.period_tracker_enabled || false}

Generate 5 challenges:
1. One daily challenge (completes today)
2. One weekly challenge (completes in 7 days)
3. Two monthly challenges (completes in 30 days)
4. One stretch challenge (difficulty: hard)

Each challenge should:
- Be specific and measurable
- Align with their focus areas and habits
- Have appropriate difficulty (easy for daily, medium for weekly, hard for monthly)
- Award points proportional to difficulty (20-50 for easy, 50-150 for medium, 150-500 for hard)
- Include concrete target numbers

Format challenges to be motivating and achievable.`,
      response_json_schema: {
        type: "object",
        properties: {
          challenges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                type: { type: "string", enum: ["daily", "weekly", "monthly"] },
                category: { type: "string", enum: ["productivity", "health", "social", "spiritual", "learning"] },
                difficulty: { type: "string", enum: ["easy", "medium", "hard", "expert"] },
                points_reward: { type: "number" },
                target_count: { type: "number" },
                criteria_type: { type: "string" },
                motivation: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Create challenges in database
    const createdChallenges = [];
    
    for (const challenge of response.challenges) {
      const endDate = new Date();
      if (challenge.type === 'daily') endDate.setDate(endDate.getDate() + 1);
      else if (challenge.type === 'weekly') endDate.setDate(endDate.getDate() + 7);
      else if (challenge.type === 'monthly') endDate.setDate(endDate.getDate() + 30);

      const created = await base44.asServiceRole.entities.Challenge.create({
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points_reward: challenge.points_reward,
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        criteria: {
          type: challenge.criteria_type,
          target: challenge.target_count
        },
        is_active: true,
        created_by: 'system'
      });

      // Create user challenge instance
      await base44.asServiceRole.entities.UserChallenge.create({
        challenge_id: created.id,
        status: 'active',
        progress: 0,
        current_count: 0,
        target_count: challenge.target_count,
        started_at: new Date().toISOString(),
        created_by: user.email
      });

      createdChallenges.push(created);
    }

    return Response.json({
      success: true,
      challenges: createdChallenges
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});