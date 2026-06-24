import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { daily_pages, reading_time } = await req.json();

    // Quran has 604 pages
    const totalPages = 604;
    const daysNeeded = Math.ceil(totalPages / daily_pages);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);

    // Create action steps for each day
    const actionSteps = [];
    for (let i = 0; i < daysNeeded; i++) {
      const stepDate = new Date();
      stepDate.setDate(stepDate.getDate() + i);
      
      actionSteps.push({
        title: `Read ${daily_pages} pages`,
        completed: false,
        due_date: stepDate.toISOString().split('T')[0]
      });
    }

    // Create the goal
    const goal = await base44.entities.Goal.create({
      title: `Complete Quran Reading - ${daily_pages} pages/day`,
      description: `Read ${daily_pages} pages daily to complete the Quran in ${daysNeeded} days`,
      category: 'spiritual',
      target_date: targetDate.toISOString().split('T')[0],
      status: 'in_progress',
      priority: 'high',
      progress: 0,
      action_steps: actionSteps,
      notes: `Daily reading time: ${reading_time}`
    });

    // Create daily calendar events for the next 30 days (or all days if less than 30)
    const eventsToCreate = Math.min(30, daysNeeded);
    const events = [];
    
    for (let i = 0; i < eventsToCreate; i++) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + i);
      
      const [hours, minutes] = reading_time.split(':');
      const endTime = new Date();
      endTime.setHours(parseInt(hours), parseInt(minutes) + 30); // 30 min reading session
      
      const event = await base44.entities.Event.create({
        title: `📖 Quran Reading (${daily_pages} pages)`,
        description: `Daily Quran reading challenge - Day ${i + 1}/${daysNeeded}`,
        date: eventDate.toISOString().split('T')[0],
        start_time: reading_time,
        end_time: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        category: 'prayer',
        is_recurring: false,
        reminder_minutes: 15,
        color: '#10b981',
        notes: `Goal: ${goal.id}`
      });
      
      events.push(event);
    }

    return Response.json({
      success: true,
      goal_id: goal.id,
      events_created: events.length,
      total_days: daysNeeded,
      target_date: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});