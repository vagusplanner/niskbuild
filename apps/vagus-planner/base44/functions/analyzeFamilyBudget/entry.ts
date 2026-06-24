import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { family_group_id, month } = await req.json();
    if (!family_group_id || !month) return Response.json({ error: 'family_group_id and month required' }, { status: 400 });

    // Fetch last 3 months of expenses + current limits
    const allEntries = await base44.asServiceRole.entities.FamilyBudget.filter({ family_group_id });
    const expenses = allEntries.filter(e => e.entry_type === 'expense');
    const limits   = allEntries.filter(e => e.entry_type === 'limit' && e.month === month);

    // Summarise by category for the current month
    const currentExpenses = expenses.filter(e => e.month === month);
    const byCategory = {};
    for (const e of currentExpenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    }

    // Previous month totals for trend
    const [y, m] = month.split('-').map(Number);
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const prevExpenses = expenses.filter(e => e.month === prevMonth);
    const prevByCategory = {};
    for (const e of prevExpenses) {
      prevByCategory[e.category] = (prevByCategory[e.category] || 0) + (e.amount || 0);
    }

    const limitsMap = {};
    for (const l of limits) limitsMap[l.category] = l.amount;

    const totalSpent  = Object.values(byCategory).reduce((a, b) => a + b, 0);
    const totalLimits = Object.values(limitsMap).reduce((a, b) => a + b, 0);

    const summaryText = Object.entries(byCategory)
      .map(([cat, amt]) => {
        const limit = limitsMap[cat];
        const prev  = prevByCategory[cat] || 0;
        const diff  = amt - prev;
        return `${cat}: £${amt.toFixed(2)}${limit ? ` (limit £${limit.toFixed(2)}, ${amt > limit ? 'OVER by £' + (amt - limit).toFixed(2) : 'under'})` : ''}, prev month £${prev.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`;
      })
      .join('\n');

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a family financial advisor. Analyse this family's spending for ${month} and provide actionable, specific advice.

Spending summary:
${summaryText}

Total spent: £${totalSpent.toFixed(2)}
Total budget limits: £${totalLimits > 0 ? totalLimits.toFixed(2) : 'not set'}

Provide:
1. Top 3 specific saving opportunities with estimated monthly savings
2. 2-3 positive spending habits to acknowledge
3. A short overall financial health score (1-10) with brief explanation
4. One Islamic finance tip (e.g. sadaqah budgeting, avoiding waste/israf)`,
      response_json_schema: {
        type: 'object',
        properties: {
          savings_opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                suggestion: { type: 'string' },
                estimated_saving: { type: 'string' }
              }
            }
          },
          positive_habits: { type: 'array', items: { type: 'string' } },
          health_score: { type: 'number' },
          health_summary: { type: 'string' },
          islamic_tip: { type: 'string' }
        }
      }
    });

    console.log(`Budget analysis complete for family ${family_group_id}, month ${month}`);

    return Response.json({
      month,
      by_category: byCategory,
      prev_by_category: prevByCategory,
      limits: limitsMap,
      total_spent: totalSpent,
      total_limits: totalLimits,
      analysis,
    });

  } catch (error) {
    console.error('analyzeFamilyBudget error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});