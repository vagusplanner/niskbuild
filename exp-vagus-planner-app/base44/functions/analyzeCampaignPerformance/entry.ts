import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return Response.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    // Fetch campaign data
    const campaign = await base44.entities.EmailCampaign.get(campaign_id);

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const metrics = campaign.performance_metrics || {};
    const openRate = metrics.open_rate || 0;
    const clickRate = metrics.click_rate || 0;

    // Generate AI insights
    const insightsPrompt = `Analyze this email campaign performance and provide actionable insights:

Campaign: ${campaign.name}
Goal: ${campaign.goal}
Target Audience: ${campaign.target_audience}
Subject Line: ${campaign.subject_line}
Tone: ${campaign.tone}

Performance Metrics:
- Sent: ${metrics.sent_count || 0}
- Opened: ${metrics.opened_count || 0} (${openRate.toFixed(1)}% open rate)
- Clicked: ${metrics.clicked_count || 0} (${clickRate.toFixed(1)}% click rate)

Provide:
1. Overall performance assessment (excellent/good/average/needs improvement)
2. What worked well (2-3 specific points)
3. Areas for improvement (2-3 specific recommendations)
4. Subject line optimization tips
5. Content recommendations for future campaigns
6. A/B testing suggestions

Be specific and actionable. Format as clear sections.`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: insightsPrompt,
      add_context_from_internet: false
    });

    // Update campaign with insights
    await base44.entities.EmailCampaign.update(campaign_id, {
      ai_insights: insights
    });

    return Response.json({
      insights,
      performance_summary: {
        overall_rating: openRate > 25 ? 'Excellent' : openRate > 15 ? 'Good' : openRate > 10 ? 'Average' : 'Needs Improvement',
        open_rate: openRate,
        click_rate: clickRate,
        engagement_score: (openRate * 0.6 + clickRate * 0.4).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Campaign analysis error:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze campaign' 
    }, { status: 500 });
  }
});