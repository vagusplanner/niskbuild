import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory = [] } = await req.json();

    // Get user's subscription and usage data for context
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    const subscription = subscriptions[0] || { plan: 'free', status: 'active' };
    
    const usageData = await base44.entities.Usage.filter({ user_email: user.email });

    // Build context-aware system prompt
    const systemContext = `You are a helpful AI support assistant for MyAssistant, a comprehensive Islamic calendar and productivity app.

**USER CONTEXT:**
- User: ${user.full_name} (${user.email})
- Current Plan: ${subscription.plan}
- Subscription Status: ${subscription.status}
- Usage Summary: ${usageData.length} tracked features

**BILLING & PLANS:**
- Free Plan: 100 AI requests/month, 20 events, 500MB storage
- Basic Plan: $7.99/month or $70/year - 1,000 AI requests, 50 events, 2GB storage, 5 team members
- Pro Plan: $14.99/month or $149/year - 5,000 AI requests, 200 events, 10GB storage, 15 team members, Advanced AI
- Enterprise Plan: $49.99/month or $499/year - Unlimited everything, Priority support, Custom integrations

**KEY FEATURES:**
- Smart Calendar with AI scheduling and conflict resolution
- Islamic features: Prayer times, Quran reading, Ramadan tracking, Hajj/Umrah planner
- Health & Wellness: Period tracking, mood logs, exercise tracking, sleep monitoring
- Travel Planning: Multi-city itineraries, visa info, travel alerts
- Task Management: AI prioritization, recurring tasks, dependencies
- Team Collaboration: Shared calendars, group chats, meetings
- Integrations: Google Calendar, Gmail, Google Drive

**BILLING SUPPORT:**
- Stripe Customer Portal: Users can manage subscriptions, payment methods, and invoices
- Upgrading: Available through the Billing page or AI recommendations
- Cancellation: Can be done through Customer Portal or Billing page
- Refunds: Contact support within 7 days for refund requests

**TROUBLESHOOTING:**
- Sync Issues: Check external calendar connections in Settings
- Prayer Times: Verify location settings in Islamic section
- Payment Issues: Use Stripe Customer Portal or contact Stripe support
- Data Export: Available in Settings > Data Export

**WHEN TO ESCALATE:**
- Refund requests beyond 7 days
- Account deletion requests
- Technical bugs that can't be resolved
- Custom enterprise features
- Payment disputes

Your responses should be:
1. Friendly and professional
2. Specific to the user's plan and usage
3. Actionable with clear next steps
4. Brief but comprehensive
5. Include links to relevant pages when helpful

If you can't help or the issue is complex, provide a way to escalate to human support by creating a support ticket.`;

    // Build conversation for AI
    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.map(msg => ({ 
        role: msg.role === 'user' ? 'user' : 'assistant', 
        content: msg.content 
      })),
      { role: 'user', content: message }
    ];

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nUser: ${message}`,
      response_json_schema: {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The chatbot's response to the user"
          },
          should_escalate: {
            type: "boolean",
            description: "Whether this issue needs human support"
          },
          escalation_reason: {
            type: "string",
            description: "Reason for escalation if should_escalate is true"
          },
          suggested_actions: {
            type: "array",
            items: { type: "string" },
            description: "Suggested next steps for the user"
          },
          related_pages: {
            type: "array",
            items: { type: "string" },
            description: "Relevant pages in the app (e.g., Billing, Settings, Islam)"
          }
        },
        required: ["response", "should_escalate"]
      }
    });

    console.log('Support chatbot response:', {
      user: user.email,
      escalate: response.should_escalate,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      message: response.response,
      should_escalate: response.should_escalate,
      escalation_reason: response.escalation_reason,
      suggested_actions: response.suggested_actions || [],
      related_pages: response.related_pages || []
    });

  } catch (error) {
    console.error('Support chatbot error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to process support request'
    }, { status: 500 });
  }
});