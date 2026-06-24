import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal, target_audience, tone, key_points, action } = await req.json();

    if (!goal || !target_audience) {
      return Response.json({ error: 'Goal and target audience are required' }, { status: 400 });
    }

    // Generate email body
    const emailPrompt = `Write a compelling marketing email with the following details:
- Goal: ${goal}
- Target Audience: ${target_audience}
- Tone: ${tone || 'professional'}
${key_points ? `- Key Points to Include: ${key_points}` : ''}

Create an engaging email that speaks to the audience, includes a clear call-to-action, and aligns with the goal. Keep it concise and impactful (300-500 words).`;

    const emailBody = await base44.integrations.Core.InvokeLLM({
      prompt: emailPrompt,
      add_context_from_internet: false
    });

    // Generate subject line suggestions
    const subjectPrompt = `Generate 5 compelling email subject lines optimized for high open rates for a marketing email with these details:
- Goal: ${goal}
- Target Audience: ${target_audience}
- Tone: ${tone || 'professional'}

Make them attention-grabbing, concise (under 60 characters), and specific. Use proven techniques like curiosity, urgency, personalization, or value proposition. Return only the subject lines, one per line.`;

    const subjectLines = await base44.integrations.Core.InvokeLLM({
      prompt: subjectPrompt,
      add_context_from_internet: false
    });

    // Parse subject lines into array
    const subjectLineArray = subjectLines
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim());

    return Response.json({
      email_body: emailBody,
      subject_lines: subjectLineArray,
      recommended_subject: subjectLineArray[0] || 'Untitled Campaign'
    });
  } catch (error) {
    console.error('Email draft error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate email campaign' 
    }, { status: 500 });
  }
});