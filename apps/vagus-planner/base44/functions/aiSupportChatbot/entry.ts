import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, ticket_id, conversation_history = [] } = await req.json();

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch FAQs for knowledge base
    const allFAQs = await base44.entities.FAQ.filter({ is_published: true });

    // Get user's account info (safely)
    const userSettings = await base44.entities.UserSettings.filter({ 
      created_by: user.email 
    });
    const settings = userSettings[0] || {};

    // Get comprehensive user activity for context
    const [recentEvents, recentTasks, prayerLogs, quranReadings, goals, holidays, supportTickets, gamificationPoints] = await Promise.all([
      base44.entities.Event.list('-start_date', 10).catch(() => []),
      base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } }).catch(() => []),
      base44.entities.PrayerLog.list('-date', 7).catch(() => []),
      base44.entities.QuranReading.list('-created_date', 5).catch(() => []),
      base44.entities.Goal.filter({ status: 'in_progress' }).catch(() => []),
      base44.entities.Holiday.filter({ status: { $in: ['planned', 'booked'] } }).catch(() => []),
      base44.entities.SupportTicket.filter({ 
        created_by: user.email,
        status: { $in: ['open', 'in_progress'] }
      }).catch(() => []),
      base44.entities.GamificationPoints.list('-created_date', 20).catch(() => [])
    ]);

    // Build comprehensive context for AI
    const userContext = {
      name: user.full_name,
      email: user.email,
      role: user.role,
      language: settings.language || 'en',
      theme: settings.theme || 'light',
      prayer_enabled: settings.prayer_enabled || false,
      quran_translation: settings.quran_translation || 'sahih',
      notifications_enabled: settings.notifications_enabled,
      recent_events_count: recentEvents.length,
      upcoming_events: recentEvents.filter(e => new Date(e.start_date) > new Date()).length,
      pending_tasks_count: recentTasks.length,
      recent_prayers_logged: prayerLogs.length,
      quran_sessions: quranReadings.length,
      active_goals: goals.length,
      planned_trips: holidays.length,
      open_support_tickets: supportTickets.length,
      total_points: gamificationPoints.reduce((sum, p) => sum + p.points_earned, 0),
      last_activity: gamificationPoints[0]?.created_date || 'No recent activity'
    };

    // Prepare FAQ knowledge base
    const faqKnowledge = allFAQs.map(faq => ({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags || []
    }));

    const systemPrompt = `You are an AI customer support assistant for "VAGUS PLANNER" - a comprehensive calendar and Islamic lifestyle app.

USER PROFILE:
- Name: ${userContext.name} | Role: ${userContext.role} | Language: ${userContext.language}
- Theme: ${userContext.theme} | Prayer tracking: ${userContext.prayer_enabled ? 'Enabled' : 'Disabled'}
- Quran translation: ${userContext.quran_translation} | Notifications: ${userContext.notifications_enabled ? 'On' : 'Off'}

USER ACTIVITY INSIGHTS:
- Events: ${userContext.recent_events_count} recent (${userContext.upcoming_events} upcoming)
- Tasks: ${userContext.pending_tasks_count} pending
- Prayers logged: ${userContext.recent_prayers_logged} in past week
- Quran sessions: ${userContext.quran_sessions} recently
- Active goals: ${userContext.active_goals}
- Planned trips: ${userContext.planned_trips}
- Gamification points: ${userContext.total_points}
- Open tickets: ${userContext.open_support_tickets}
- Last activity: ${userContext.last_activity}

COMPREHENSIVE APP FEATURES YOU SUPPORT:

📅 CALENDAR SYSTEM:
- Event creation (one-time, recurring, all-day)
- Calendar views (month, week, day, agenda, yearly)
- Event categories & colors
- Reminders (multiple per event)
- Recurring patterns (daily, weekly, monthly, yearly with exceptions)
- Holiday adjustments for recurring events
- External calendar sync (Google Calendar)
- Smart event suggestions
- AI scheduling assistant
- Conflict detection & resolution
- Meeting scheduler with voting
- Event sharing & collaboration
- Calendar export/import

🕌 ISLAMIC FEATURES:
- Prayer times (multiple calculation methods)
- Prayer tracking & analytics
- Adhan notifications
- Qibla finder
- Quran reader (multiple translations & reciters)
- Quran memorization tracker
- Daily verse & Hadith
- Dhikr counter (Tasbih)
- Hijri calendar
- Islamic events & reminders
- Ramadan tracker & challenges
- Fasting tracker (voluntary & obligatory)
- Zakat calculator (multi-year tracking)
- Sadaqah tracker
- Hajj/Umrah planner with AI guidance
- Du'a collections & reminders
- Daily routines (Islamic practices)

📊 HEALTH & WELLNESS:
- Period tracker
- Sleep tracking
- Exercise logging
- Nutrition & meal tracking
- Mood tracking
- Energy level monitoring
- Health goals
- Wellness insights

✈️ TRAVEL PLANNING:
- Holiday/trip creation
- Multi-city itineraries
- Budget tracking
- Expense splitting
- Travel alerts
- Visa requirements checker
- Packing list generator
- Booking integration suggestions
- Trip collaboration & sharing

✅ TASKS & PRODUCTIVITY:
- Task management (with subtasks)
- Priority levels & categories
- Due dates & reminders
- Recurring tasks
- Task sharing & assignment
- Team collaboration
- Goal tracking
- Habit tracking

🎮 GAMIFICATION:
- Points system (health, Islamic, travel, productivity)
- Badges & achievements
- Streaks & consistency tracking
- Leaderboards
- Challenges

👥 COLLABORATION:
- Event sharing
- Calendar sharing
- Team management
- Group chats
- Meeting scheduling
- Comment threads

🤖 AI FEATURES:
- Smart scheduling suggestions
- Event categorization
- Conflict resolution
- Proactive reminders
- Personalized insights
- Daily briefings (morning/evening)
- Goal recommendations
- Travel planning assistance
- Islamic content personalization
- Health coaching
- Support chatbot (you!)

⚙️ SETTINGS & CUSTOMIZATION:
- Language (EN, AR, FR, TR, UR)
- Theme (light/dark/auto)
- Color palettes
- Font size
- Calendar view preferences
- Notification preferences
- Prayer calculation methods
- Week start day
- Time zones
- Do Not Disturb schedules

KNOWLEDGE BASE (FAQs):
${faqKnowledge.slice(0, 30).map((faq, i) => `${i + 1}. [${faq.category}] Q: ${faq.question}\n   A: ${faq.answer}`).join('\n\n')}

CONVERSATION HISTORY:
${conversation_history.slice(-10).map(h => `${h.role}: ${h.message}`).join('\n')}

USER MESSAGE: ${message}

WHEN TO ESCALATE TO HUMAN AGENT:
- Billing/payment disputes or refund requests
- Account security issues (unauthorized access, password recovery)
- Critical bugs affecting data integrity
- Feature requests requiring product decisions
- Legal/compliance questions (GDPR, privacy)
- User is frustrated/angry (check sentiment)
- Complex technical issues beyond your scope
- Repeated failed solutions (3+ attempts)

YOUR RESPONSE APPROACH:
1. Acknowledge the user's issue with empathy
2. Reference their activity/settings if relevant
3. Provide clear, step-by-step solutions
4. Offer proactive suggestions based on their usage
5. Ask if they need help with related features
6. Determine escalation necessity

Be warm, professional, and solution-oriented. Use emojis sparingly. Provide concise but complete answers.`;

    const responseSchema = {
      type: "object",
      properties: {
        response: { type: "string", description: "Your response to the user" },
        solution_steps: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step solution if applicable"
        },
        needs_escalation: { type: "boolean", description: "Whether to escalate to human" },
        escalation_reason: { type: "string", description: "Why escalation is needed" },
        suggested_category: {
          type: "string",
          enum: ["account", "billing", "technical", "feature_request", "bug_report", "other"]
        },
        related_faq_ids: {
          type: "array",
          items: { type: "string" },
          description: "Related FAQ article IDs"
        },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "frustrated", "angry"],
          description: "User's emotional tone"
        }
      },
      required: ["response", "needs_escalation", "suggested_category", "sentiment"]
    };

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: systemPrompt,
      response_json_schema: responseSchema,
      add_context_from_internet: false
    });

    // Update conversation history
    const updatedHistory = [
      ...conversation_history,
      { role: 'user', message, timestamp: new Date().toISOString() },
      { role: 'assistant', message: aiResponse.response, timestamp: new Date().toISOString() }
    ];

    let ticketId = ticket_id;

    // Create or update support ticket
    if (!ticketId) {
      const ticket = await base44.entities.SupportTicket.create({
        subject: message.substring(0, 100),
        description: message,
        category: aiResponse.suggested_category,
        conversation_history: updatedHistory,
        escalated_to_human: aiResponse.needs_escalation,
        escalation_reason: aiResponse.escalation_reason,
        status: aiResponse.needs_escalation ? 'waiting_response' : 'open'
      });
      ticketId = ticket.id;
    } else {
      // Update existing ticket
      const existingTicket = await base44.entities.SupportTicket.filter({ id: ticket_id });
      if (existingTicket.length > 0) {
        await base44.entities.SupportTicket.update(ticket_id, {
          conversation_history: updatedHistory,
          escalated_to_human: aiResponse.needs_escalation || existingTicket[0].escalated_to_human,
          escalation_reason: aiResponse.escalation_reason || existingTicket[0].escalation_reason,
          status: aiResponse.needs_escalation ? 'waiting_response' : existingTicket[0].status
        });
      }
    }

    // If escalated, notify admin with full context
    if (aiResponse.needs_escalation) {
      const conversationHtml = updatedHistory
        .map(h => `<div style="margin: 10px 0; padding: 10px; background: ${h.role === 'user' ? '#e0f2fe' : '#f1f5f9'}; border-radius: 6px;">
          <strong>${h.role === 'user' ? 'User' : 'AI'}:</strong> ${h.message}
          <br><small style="color: #64748b;">${new Date(h.timestamp).toLocaleString()}</small>
        </div>`)
        .join('');

      await base44.integrations.Core.SendEmail({
        to: 'support@vagusplanner.com', // Change to your support email
        subject: `🚨 Support Escalation: ${aiResponse.suggested_category} - ${user.full_name}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🚨 Support Ticket Escalated</h2>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
              <h3>User Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.full_name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.email}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Role:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${user.role}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Language:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${userContext.language}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Total Points:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${userContext.total_points}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Last Activity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${userContext.last_activity}</td></tr>
              </table>

              <h3 style="margin-top: 20px;">Escalation Details</h3>
              <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 10px 0;">
                <p><strong>Reason:</strong> ${aiResponse.escalation_reason}</p>
                <p><strong>Category:</strong> ${aiResponse.suggested_category}</p>
                <p><strong>Sentiment:</strong> <span style="padding: 4px 8px; background: ${aiResponse.sentiment === 'angry' ? '#fee2e2' : aiResponse.sentiment === 'frustrated' ? '#fef3c7' : '#dbeafe'}; border-radius: 4px; font-weight: bold;">${aiResponse.sentiment.toUpperCase()}</span></p>
                <p><strong>Ticket ID:</strong> ${ticketId}</p>
              </div>

              <h3>User Activity Summary</h3>
              <ul>
                <li>${userContext.pending_tasks_count} pending tasks</li>
                <li>${userContext.upcoming_events} upcoming events</li>
                <li>${userContext.active_goals} active goals</li>
                <li>${userContext.recent_prayers_logged} prayers logged (past week)</li>
                <li>${userContext.planned_trips} planned trips</li>
                <li>${userContext.open_support_tickets} other open tickets</li>
              </ul>

              <h3>Full Conversation</h3>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                ${conversationHtml}
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <a href="https://app.base44.com" style="background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Ticket in Dashboard</a>
              </div>
            </div>
          </div>
        `
      });
    }

    return Response.json({
      success: true,
      ticket_id: ticketId,
      response: aiResponse.response,
      solution_steps: aiResponse.solution_steps || [],
      needs_escalation: aiResponse.needs_escalation,
      escalation_reason: aiResponse.escalation_reason,
      sentiment: aiResponse.sentiment,
      conversation_history: updatedHistory
    });

  } catch (error) {
    console.error('Support chatbot error:', error);
    return Response.json({
      error: 'Failed to process support request',
      details: error.message
    }, { status: 500 });
  }
});