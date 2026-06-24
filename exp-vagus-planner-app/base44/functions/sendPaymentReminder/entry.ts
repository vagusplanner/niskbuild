import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holiday_title, expense_title, amount, paid_by, owed_by } = await req.json();

    // Send email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owed_by,
      subject: `Payment Reminder: ${holiday_title}`,
      body: `Hi there!

This is a friendly reminder about a shared expense from your trip "${holiday_title}".

Expense: ${expense_title}
Amount owed: $${amount.toFixed(2)}
Paid by: ${paid_by}

Please arrange payment with ${paid_by} when convenient.

Thanks!
MyAssistant`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});