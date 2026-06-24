import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_id, outcome_notes, attendees } = await req.json();

    if (!meeting_id || !outcome_notes) {
      return Response.json({ 
        error: 'Missing required fields: meeting_id and outcome_notes' 
      }, { status: 400 });
    }

    // Use AI to analyze the meeting content
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert meeting analyst. Analyze the following meeting notes and extract actionable insights.

Meeting Notes:
${outcome_notes}

Attendees: ${attendees?.join(', ') || 'Not specified'}

Your task is to:
1. Identify KEY DECISIONS made during the meeting (what was decided and why)
2. Extract ACTION ITEMS with clear owners and realistic deadlines
3. Suggest potential FOLLOW-UP TOPICS that need further discussion

Be specific, actionable, and practical. For action items, suggest realistic deadlines based on typical business timelines.

Return structured data as JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          key_decisions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                decision: { type: 'string', description: 'The decision that was made' },
                rationale: { type: 'string', description: 'Why this decision was made' },
                decided_by: { type: 'string', description: 'Who made or led this decision' },
                impact: { type: 'string', description: 'Expected impact or implications' }
              }
            },
            description: 'Key decisions made during the meeting'
          },
          action_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string', description: 'Clear, actionable task description' },
                owner: { type: 'string', description: 'Person responsible (name or role)' },
                deadline: { type: 'string', description: 'Suggested deadline in YYYY-MM-DD format' },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Task priority level'
                },
                context: { type: 'string', description: 'Additional context or dependencies' }
              }
            },
            description: 'Actionable items with owners and deadlines'
          },
          follow_up_topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'Topic that needs follow-up' },
                reason: { type: 'string', description: 'Why this needs a follow-up meeting' },
                suggested_attendees: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Who should attend the follow-up'
                },
                urgency: { 
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'How urgent this follow-up is'
                }
              }
            },
            description: 'Topics requiring future meetings or discussions'
          },
          overall_summary: {
            type: 'string',
            description: 'Brief 2-3 sentence summary of the meeting'
          }
        }
      }
    });

    return Response.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Error analyzing meeting content:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze meeting content'
    }, { status: 500 });
  }
});