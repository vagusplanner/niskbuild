import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all user-owned data in parallel
    const userEmail = user.email;

    try {
      const [tasks, goals, events, settings, periods, habits] = await Promise.all([
        base44.entities.Task.filter({ created_by: userEmail }),
        base44.entities.Goal.filter({ created_by: userEmail }),
        base44.entities.Event.filter({ created_by: userEmail }),
        base44.entities.UserSettings.filter({ created_by: userEmail }),
        base44.entities.Period.filter({ created_by: userEmail }),
        base44.entities.Habit.filter({ created_by: userEmail }),
      ]);

      await Promise.all([
        ...tasks.map(r => base44.entities.Task.delete(r.id)),
        ...goals.map(r => base44.entities.Goal.delete(r.id)),
        ...events.map(r => base44.entities.Event.delete(r.id)),
        ...settings.map(r => base44.entities.UserSettings.delete(r.id)),
        ...periods.map(r => base44.entities.Period.delete(r.id)),
        ...habits.map(r => base44.entities.Habit.delete(r.id)),
      ]);
    } catch (cleanupError) {
      console.warn('Some data cleanup failed:', cleanupError.message);
    }

    console.log(`Account deletion requested for: ${userEmail}`);

    return Response.json({ success: true, message: 'Account data deleted. You will be logged out.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});