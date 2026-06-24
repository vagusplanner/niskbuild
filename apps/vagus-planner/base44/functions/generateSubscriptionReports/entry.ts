import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate automated subscription and revenue reports
 * Runs weekly/monthly to provide insights
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { reportType, period } = await req.json(); // 'week' or 'month'

    const periodDays = period === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch all subscriptions
    const allSubscriptions = await base44.asServiceRole.entities.Subscription.list();
    
    // Fetch invoices for the period
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const periodInvoices = invoices.filter(inv => 
      new Date(inv.issued_date) >= startDate
    );

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubs = allSubscriptions.filter(s => 
      s.status === 'active' || s.status === 'grace_period'
    );
    
    const planPricing = {
      basic: 9.99,
      pro: 29.99,
      premium: 79.99
    };
    
    const mrr = activeSubs.reduce((sum, sub) => {
      return sum + (planPricing[sub.plan] || 0);
    }, 0);

    // Calculate churn rate
    const canceledInPeriod = allSubscriptions.filter(s => 
      s.canceled_at && new Date(s.canceled_at) >= startDate
    ).length;
    
    const churnRate = activeSubs.length > 0 
      ? (canceledInPeriod / (activeSubs.length + canceledInPeriod)) * 100 
      : 0;

    // Revenue by plan
    const revenueByPlan = {};
    periodInvoices.forEach(inv => {
      revenueByPlan[inv.plan] = (revenueByPlan[inv.plan] || 0) + inv.amount;
    });

    // Failed payments
    const failedPayments = allSubscriptions.filter(s => 
      s.status === 'past_due' || s.payment_retry_count > 0
    ).length;

    // New subscriptions
    const newSubs = allSubscriptions.filter(s => 
      new Date(s.created_date) >= startDate
    ).length;

    // Cancellation reasons
    const cancellationReasons = {};
    allSubscriptions
      .filter(s => s.cancellation_reason)
      .forEach(s => {
        cancellationReasons[s.cancellation_reason] = 
          (cancellationReasons[s.cancellation_reason] || 0) + 1;
      });

    const report = {
      period: period === 'month' ? 'Monthly' : 'Weekly',
      generated_at: new Date().toISOString(),
      metrics: {
        mrr: mrr.toFixed(2),
        activeSubscriptions: activeSubs.length,
        newSubscriptions: newSubs,
        churnRate: churnRate.toFixed(2) + '%',
        totalRevenue: periodInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2),
        failedPayments,
        averageRevenuePerUser: activeSubs.length > 0 
          ? (mrr / activeSubs.length).toFixed(2) 
          : '0'
      },
      revenueByPlan,
      cancellationReasons,
      planDistribution: {
        free: allSubscriptions.filter(s => s.plan === 'free').length,
        basic: allSubscriptions.filter(s => s.plan === 'basic').length,
        pro: allSubscriptions.filter(s => s.plan === 'pro').length,
        premium: allSubscriptions.filter(s => s.plan === 'premium').length
      }
    };

    // Send report email to admin(s)
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    
    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `${report.period} Subscription Report - ${new Date().toLocaleDateString()}`,
        body: `
          <h2>${report.period} Subscription Report</h2>
          <h3>Key Metrics:</h3>
          <ul>
            <li><strong>MRR:</strong> $${report.metrics.mrr}</li>
            <li><strong>Active Subscriptions:</strong> ${report.metrics.activeSubscriptions}</li>
            <li><strong>New Subscriptions:</strong> ${report.metrics.newSubscriptions}</li>
            <li><strong>Churn Rate:</strong> ${report.metrics.churnRate}</li>
            <li><strong>Total Revenue:</strong> $${report.metrics.totalRevenue}</li>
            <li><strong>Failed Payments:</strong> ${report.metrics.failedPayments}</li>
            <li><strong>ARPU:</strong> $${report.metrics.averageRevenuePerUser}</li>
          </ul>
          
          <h3>Revenue by Plan:</h3>
          <ul>
            ${Object.entries(report.revenueByPlan).map(([plan, revenue]) => 
              `<li><strong>${plan}:</strong> $${revenue.toFixed(2)}</li>`
            ).join('')}
          </ul>
          
          <h3>Plan Distribution:</h3>
          <ul>
            ${Object.entries(report.planDistribution).map(([plan, count]) => 
              `<li><strong>${plan}:</strong> ${count} users</li>`
            ).join('')}
          </ul>
          
          ${Object.keys(cancellationReasons).length > 0 ? `
            <h3>Top Cancellation Reasons:</h3>
            <ul>
              ${Object.entries(cancellationReasons)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([reason, count]) => 
                  `<li><strong>${reason}:</strong> ${count}</li>`
                ).join('')}
            </ul>
          ` : ''}
        `
      });
    }

    return Response.json({ success: true, report });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});