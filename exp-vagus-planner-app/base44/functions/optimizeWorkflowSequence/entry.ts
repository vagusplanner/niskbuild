import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflow_name, trigger_type, steps, goal } = await req.json();

    if (!steps || steps.length === 0) {
      return Response.json({ error: 'steps array required' }, { status: 400 });
    }

    // Ask AI to optimize the workflow sequence
    const prompt = `You are a workflow automation expert. Analyze and optimize this workflow:

Workflow Name: ${workflow_name || 'Untitled'}
Trigger: ${trigger_type || 'Not specified'}
Goal: ${goal || 'Automate tasks efficiently'}

Current Steps:
${steps.map((s, i) => `${i + 1}. ${s.type}: ${s.description || 'No description'}`).join('\n')}

Provide optimization recommendations:
1. Suggest optimal step order (if reordering would help)
2. Identify missing steps that would improve the workflow
3. Recommend conditions to add for reliability
4. Suggest wait times between steps (if needed)
5. Identify potential issues or conflicts
6. Provide 3 specific improvements with reasons

Return structured recommendations.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          optimal_order: {
            type: "array",
            items: { type: "number" },
            description: "Suggested step indices in optimal order"
          },
          missing_steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                position: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          recommended_conditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_index: { type: "number" },
                condition: { type: "object" },
                reason: { type: "string" }
              }
            }
          },
          wait_times: {
            type: "array",
            items: {
              type: "object",
              properties: {
                after_step: { type: "number" },
                duration_ms: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          potential_issues: {
            type: "array",
            items: { type: "string" }
          },
          improvements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          overall_score: { type: "number", description: "Workflow quality score 1-10" }
        }
      }
    });

    return Response.json({
      success: true,
      optimizations: response,
      original_step_count: steps.length
    });

  } catch (error) {
    console.error('Error optimizing workflow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});