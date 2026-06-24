import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, user_feedback = '', modifications = [] } = await req.json();

    const feedback = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this Hajj/Umrah plan and provide detailed AI feedback.

Plan Summary: ${plan.summary}
Budget: $${plan.budget_breakdown?.total}
Duration: ${plan.daily_schedule?.length} days
User Feedback: "${user_feedback}"
Requested Modifications: ${modifications.join(', ') || 'None'}

Provide comprehensive feedback in JSON format:
{
  "overall_assessment": {
    "rating": "1-5 stars",
    "key_strengths": ["strength 1", "strength 2"],
    "areas_for_improvement": ["area 1", "area 2"]
  },
  "optimizations": [
    {
      "category": "category name",
      "suggestion": "specific suggestion",
      "benefit": "why this helps",
      "implementation": "how to apply"
    }
  ],
  "risk_analysis": {
    "identified_risks": [
      {
        "risk": "risk description",
        "severity": "low|medium|high",
        "mitigation": "how to prevent"
      }
    ]
  },
  "cost_efficiency": {
    "current_budget": number,
    "optimization_savings": number,
    "premium_upgrades": [
      {
        "upgrade": "description",
        "additional_cost": number,
        "value": "why worth it"
      }
    ]
  },
  "time_optimization": {
    "total_active_hours": number,
    "total_rest_hours": number,
    "efficiency_rating": "percentage",
    "suggestions": ["time optimization tip 1"]
  },
  "spiritual_depth": {
    "reflection_opportunities": "count",
    "learning_opportunities": "count",
    "community_engagement": "count",
    "assessment": "how spiritually rich is this plan"
  },
  "accessibility_review": {
    "mobility_consideration": "rating",
    "rest_adequacy": "rating",
    "accessibility_gaps": ["gap 1"],
    "recommended_modifications": ["mod 1"]
  },
  "personalization_alignment": {
    "budget_fit": "percentage match",
    "interests_coverage": "percentage match",
    "pace_alignment": "percentage match",
    "overall_fit": "percentage match"
  },
  "alternative_scenarios": {
    "if_weather_changes": "contingency plan",
    "if_more_time": "extended itinerary suggestion",
    "if_less_budget": "cost-reduction strategy"
  },
  "detailed_recommendations": "comprehensive paragraph of improvements",
  "implementation_priority": [
    {
      "priority": 1,
      "action": "highest priority change",
      "impact": "expected outcome"
    }
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "object" },
          optimizations: { type: "array" },
          risk_analysis: { type: "object" },
          cost_efficiency: { type: "object" },
          time_optimization: { type: "object" },
          spiritual_depth: { type: "object" },
          accessibility_review: { type: "object" },
          personalization_alignment: { type: "object" },
          alternative_scenarios: { type: "object" },
          detailed_recommendations: { type: "string" },
          implementation_priority: { type: "array" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      feedback: feedback,
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Feedback analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});