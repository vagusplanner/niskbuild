import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Sample events
    const sampleEvents = [
      {
        title: '📝 Welcome to MyAssistant!',
        description: 'This is a sample event. Click to edit or delete it. Try creating your own events!',
        start_date: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
        end_date: new Date(today.setHours(15, 0, 0, 0)).toISOString(),
        category: 'personal',
        color: '#14b8a6',
        is_all_day: false
      },
      {
        title: '💼 Team Meeting (Example)',
        description: 'Sample work event - try the AI assistant to get meeting suggestions!',
        start_date: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
        end_date: new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString(),
        category: 'work',
        location: 'Conference Room A',
        is_all_day: false
      },
      {
        title: '🏋️ Workout Session',
        description: 'Sample health event - track your fitness goals!',
        start_date: new Date(nextWeek.setHours(18, 0, 0, 0)).toISOString(),
        end_date: new Date(nextWeek.setHours(19, 0, 0, 0)).toISOString(),
        category: 'health',
        is_all_day: false
      }
    ];

    // Sample tasks
    const sampleTasks = [
      {
        title: '✅ Complete your profile',
        description: 'Add your photo and personal details',
        status: 'todo',
        priority: 'medium',
        category: 'personal',
        due_date: tomorrow.toISOString().split('T')[0]
      },
      {
        title: '🤖 Try the AI Assistant',
        description: 'Ask the AI to help you schedule your week',
        status: 'todo',
        priority: 'high',
        category: 'personal',
        due_date: today.toISOString().split('T')[0]
      }
    ];

    // Sample Quran verse for today
    const sampleVerse = {
      surah_name: 'Al-Baqarah',
      surah_number: 2,
      verse_number: 185,
      arabic_text: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ',
      translation: 'The month of Ramadan in which was revealed the Quran, a guidance for mankind and clear proofs for guidance and the criterion (between right and wrong).',
      date: today.toISOString().split('T')[0],
      is_favorite: true
    };

    // Create sample data
    const createdEvents = [];
    const createdTasks = [];

    for (const event of sampleEvents) {
      const created = await base44.asServiceRole.entities.Event.create({
        ...event,
        created_by: user.email
      });
      createdEvents.push(created);
    }

    for (const task of sampleTasks) {
      const created = await base44.asServiceRole.entities.Task.create({
        ...task,
        created_by: user.email
      });
      createdTasks.push(created);
    }

    await base44.asServiceRole.entities.QuranVerse.create({
      ...sampleVerse,
      created_by: user.email
    });

    // Award "Early Adopter" badge
    await base44.asServiceRole.entities.UserAchievement.create({
      title: 'Early Adopter',
      description: 'Joined MyAssistant and completed onboarding',
      badge_key: 'early_adopter',
      earned_date: new Date().toISOString(),
      category: 'general',
      points_value: 100,
      created_by: user.email
    });

    // Award initial points
    await base44.asServiceRole.entities.GamificationPoints.create({
      activity_type: 'complete_onboarding',
      points_earned: 100,
      category: 'general',
      description: 'Completed onboarding successfully',
      created_by: user.email
    });

    return Response.json({
      success: true,
      created: {
        events: createdEvents.length,
        tasks: createdTasks.length,
        verse: 1,
        badge: 1,
        points: 100
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});