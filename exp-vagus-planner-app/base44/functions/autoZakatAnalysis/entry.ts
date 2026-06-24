import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GOLD_PRICE_PER_GRAM = 62;
const SILVER_PRICE_PER_GRAM = 0.80;
const NISAB_SILVER_GRAMS = 595;
const ZAKAT_RATE = 0.025;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action = 'analyze', currency = 'USD' } = body;

    if (action === 'auto_snapshot') {
      // Pull from expense/financial logs to build wealth estimate
      const expenses = await base44.entities.Expense.filter({ created_by: user.email }).catch(() => []);

      // Sum income vs expenses over last 30 days to estimate net savings change
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentExpenses = expenses.filter(e => e.date >= thirtyDaysAgo);

      const totalIncome = recentExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpenses = recentExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0);
      const netSavingsChange = totalIncome - totalExpenses;

      // Get previous snapshot to carry forward wealth
      const prevSnapshots = await base44.entities.ZakatTracking.filter({ created_by: user.email }).catch(() => []);
      prevSnapshots.sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date));
      const lastSnapshot = prevSnapshots[0];

      const baseSavings = lastSnapshot ? lastSnapshot.cash_savings : 0;
      const newCashSavings = Math.max(0, baseSavings + netSavingsChange);
      const investments = lastSnapshot?.investments || 0;
      const goldValue = lastSnapshot?.gold_value || 0;
      const liabilities = lastSnapshot?.liabilities || 0;

      const totalZakatableWealth = newCashSavings + investments + goldValue - liabilities;
      const nisabThreshold = NISAB_SILVER_GRAMS * SILVER_PRICE_PER_GRAM;
      const meetsNisab = totalZakatableWealth >= nisabThreshold;
      const zakatDue = meetsNisab ? totalZakatableWealth * ZAKAT_RATE : 0;

      // Determine hawl start date
      let hawlStartDate = lastSnapshot?.hawl_start_date || null;
      if (meetsNisab && !hawlStartDate) {
        hawlStartDate = now.toISOString().split('T')[0];
      } else if (!meetsNisab) {
        hawlStartDate = null;
      }

      const snapshot = await base44.entities.ZakatTracking.create({
        snapshot_date: now.toISOString().split('T')[0],
        cash_savings: Math.round(newCashSavings * 100) / 100,
        investments,
        gold_value: goldValue,
        liabilities,
        total_zakatable_wealth: Math.round(totalZakatableWealth * 100) / 100,
        zakat_due: Math.round(zakatDue * 100) / 100,
        nisab_threshold: Math.round(nisabThreshold * 100) / 100,
        meets_nisab: meetsNisab,
        hawl_start_date: hawlStartDate,
        currency,
        source: 'auto_from_expenses',
      });

      return Response.json({ snapshot, netSavingsChange });
    }

    if (action === 'get_suggestions') {
      const snapshots = await base44.entities.ZakatTracking.filter({ created_by: user.email }).catch(() => []);
      snapshots.sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));

      const donations = await base44.entities.CharityDonation.filter({ created_by: user.email }).catch(() => []);
      const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

      const latestSnapshot = snapshots[snapshots.length - 1];
      const hawlStart = latestSnapshot?.hawl_start_date;
      const zakatDue = latestSnapshot?.zakat_due || 0;
      const totalZakatableWealth = latestSnapshot?.total_zakatable_wealth || 0;

      // AI prompt for optimal giving suggestions
      const today = new Date().toISOString().split('T')[0];
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A Muslim user has the following Zakat financial profile:
- Current zakatable wealth: $${totalZakatableWealth.toFixed(2)}
- Zakat due: $${zakatDue.toFixed(2)}
- Hawl started: ${hawlStart || 'not yet met Nisab'}
- Total donated historically: $${totalDonated.toFixed(2)}
- Today's date: ${today}
- Wealth snapshots over time: ${snapshots.length} records

Provide 3 specific, practical suggestions for OPTIMAL TIMES to give Zakat/Sadaqah this year (considering Islamic calendar — Ramadan last 10 nights, Laylat al-Qadr, first 10 days of Dhul Hijjah, etc.), plus one observation about their wealth trend and Zakat obligation. Be specific and actionable.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  reason: { type: 'string' },
                  recommended_amount: { type: 'string' },
                  urgency: { type: 'string', enum: ['high', 'medium', 'low'] }
                }
              }
            },
            wealth_observation: { type: 'string' },
            hawl_status: { type: 'string' }
          }
        }
      });

      return Response.json({
        suggestions: result,
        latestSnapshot,
        totalDonated,
        snapshotCount: snapshots.length,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('autoZakatAnalysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});