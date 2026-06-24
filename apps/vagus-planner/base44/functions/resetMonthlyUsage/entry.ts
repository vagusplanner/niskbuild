import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Scheduled: runs on the 1st of each month at 00:01.
 * Resets all Usage counters for the new billing period.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allUsage = await base44.asServiceRole.entities.Usage.list();

    let resetCount = 0;
    // Reset all records in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < allUsage.length; i += batchSize) {
      const batch = allUsage.slice(i, i + batchSize);
      await Promise.all(
        batch.map(record =>
          base44.asServiceRole.entities.Usage.update(record.id, { count: 0, period_start: new Date().toISOString() })
        )
      );
      resetCount += batch.length;
    }

    console.log(`[INFO] Monthly usage reset complete. Reset ${resetCount} records.`);
    return Response.json({ success: true, reset_count: resetCount });
  } catch (error) {
    console.error('[ERROR] resetMonthlyUsage:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});