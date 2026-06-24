import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holiday_id, expense_type, description } = await req.json();

    // Fetch holiday and expense data
    const [holiday, expenses, shares] = await Promise.all([
      base44.entities.Holiday.filter({ id: holiday_id }),
      base44.entities.HolidayExpense.filter({ holiday_id }),
      base44.entities.HolidayShare.filter({ holiday_id, status: 'accepted' })
    ]);

    if (!holiday[0]) {
      return Response.json({ error: 'Holiday not found' }, { status: 404 });
    }

    const holidayData = holiday[0];
    const totalCollaborators = shares.length + 1;
    const currentSpending = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = holidayData.budget ? holidayData.budget - currentSpending : null;

    const prompt = `Draft a collaborative expense proposal for a group trip:

TRIP DETAILS:
- Destination: ${holidayData.destination}
- Dates: ${holidayData.start_date} to ${holidayData.end_date}
- Budget: $${holidayData.budget || 'Not set'}
- Current Spending: $${currentSpending}
- Remaining: $${remainingBudget || 'Unlimited'}
- Collaborators: ${totalCollaborators} people

EXPENSE REQUEST:
- Type: ${expense_type}
- Description: ${description}

EXISTING EXPENSES:
${expenses.slice(0, 10).map(e => `- ${e.category}: $${e.amount} - ${e.title}`).join('\n')}

Create a proposal that includes:
1. Estimated cost (total and per person)
2. Rationale/benefits
3. Alternative options (if applicable)
4. Impact on remaining budget
5. Recommended split method (equal or custom)

Be persuasive but realistic. Consider group dynamics and budget constraints.`;

    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          estimated_total: { type: "number" },
          per_person_cost: { type: "number" },
          rationale: { type: "string" },
          benefits: {
            type: "array",
            items: { type: "string" }
          },
          alternatives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                option: { type: "string" },
                cost: { type: "number" },
                pros: { type: "string" },
                cons: { type: "string" }
              }
            }
          },
          budget_impact: { type: "string" },
          recommended_split: { type: "string" },
          urgency: { type: "string" }
        }
      }
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});