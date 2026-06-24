import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { usageData, currentPlan, planLimits } = await req.json();

    // Analyze usage patterns
    const analysisPrompt = `You are an intelligent subscription advisor. Analyze the user's current usage and recommend the best upgrade plan.

Current Plan: ${currentPlan}

Usage Data:
${JSON.stringify(usageData, null, 2)}

Plan Limits Available:
- Basic Plan: $7.99/month or $70/year - 1,000 AI requests/month, 50 events, 2GB storage, 5 team members
- Pro Plan: $14.99/month or $149/year - 5,000 AI requests/month, 200 events, 10GB storage, 15 team members, Advanced AI features
- Enterprise Plan: $49.99/month or $499/year - Unlimited AI requests, Unlimited events, 50GB storage, Unlimited team members, Priority support, Custom integrations

Analyze:
1. Current usage vs plan limits
2. Growth trends (if usage is consistently high)
3. Feature utilization patterns
4. Cost-benefit analysis

Provide a recommendation with:
- Recommended plan (Pro or Enterprise)
- Key reasons (3-4 bullet points)
- Estimated ROI or benefits
- Urgency level (low/medium/high)
- Personalized message explaining why this plan fits their needs

Be concise but persuasive. Focus on value, not just features.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_plan: {
            type: "string",
            enum: ["basic", "pro", "enterprise"]
          },
          confidence: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          key_reasons: {
            type: "array",
            items: { type: "string" }
          },
          estimated_benefits: {
            type: "string"
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high"]
          },
          personalized_message: {
            type: "string"
          },
          usage_insights: {
            type: "object",
            properties: {
              current_usage_percentage: { type: "number" },
              trending_features: { type: "array", items: { type: "string" } },
              bottlenecks: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["recommended_plan", "confidence", "key_reasons", "personalized_message"]
      }
    });

    console.log('AI Plan Recommendation generated:', {
      user: user.email,
      currentPlan,
      recommendation: response.recommended_plan
    });

    return Response.json({
      recommendation: response
    });

  } catch (error) {
    console.error('Plan recommendation error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to generate plan recommendation'
    }, { status: 500 });
  }
});