import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active habits
    const habits = await base44.asServiceRole.entities.Habit.filter({ is_active: true });
    
    const today = new Date().toISOString().split('T')[0];
    const results = [];

    for (const habit of habits) {
      const userEmail = habit.created_by;

      if (habit.trigger_type === 'event_based') {
        // Find matching events
        const events = await base44.asServiceRole.entities.Event.filter({
          date: today,
          category: habit.trigger_event_category,
          created_by: userEmail
        });

        for (const event of events) {
          // Create habit reminder based on when it should happen
          let habitTime = event.start_time;
          
          if (habit.when === 'before') {
            const [h, m] = event.start_time.split(':').map(Number);
            const newTime = new Date();
            newTime.setHours(h, m - habit.duration_minutes, 0);
            habitTime = `${String(newTime.getHours()).padStart(2, '0')}:${String(newTime.getMinutes()).padStart(2, '0')}`;
          } else if (habit.when === 'after') {
            habitTime = event.end_time;
          }

          // Check if habit event already exists
          const existingHabit = await base44.asServiceRole.entities.Event.filter({
            date: today,
            title: { $regex: habit.title, $options: 'i' },
            created_by: userEmail
          });

          if (existingHabit.length === 0) {
            await base44.asServiceRole.entities.Event.create({
              title: `✅ ${habit.title}`,
              description: `Habit stacked ${habit.when} ${event.title}`,
              date: today,
              start_time: habitTime,
              end_time: habitTime,
              category: habit.category,
              reminder_minutes: 5,
              color: '#8b5cf6',
              notes: `Habit ID: ${habit.id}`,
              created_by: userEmail
            });

            results.push({
              user: userEmail,
              habit: habit.title,
              stacked_with: event.title
            });
          }
        }
      }
    }

    return Response.json({
      message: 'Habit stacking completed',
      habits_stacked: results.length,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});