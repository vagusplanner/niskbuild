import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, user_email } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    // Parse the voice query using AI
    const parseResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Parse this voice query and determine what the user wants:
"${query}"

Possible intents:
- next_event: User wants to know their next scheduled event
- next_prayer: User wants to know the next prayer time
- today_schedule: User wants their full schedule for today
- prayer_times: User wants all prayer times for today
- free_time: User wants to know when they're free

Return the intent and any relevant parameters.`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { 
            type: "string",
            enum: ["next_event", "next_prayer", "today_schedule", "prayer_times", "free_time"]
          },
          confidence: { type: "number" }
        }
      }
    });

    // Get user events and settings
    const events = await base44.asServiceRole.entities.Event.filter({
      created_by: user_email
    });

    const settings = await base44.asServiceRole.entities.UserSettings.filter({
      created_by: user_email
    });
    const userSettings = settings[0] || {};

    const now = new Date();
    let response = "";

    switch (parseResult.intent) {
      case 'next_event': {
        const upcomingEvents = events
          .filter(e => new Date(e.start_date) > now)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        if (upcomingEvents.length > 0) {
          const next = upcomingEvents[0];
          const startTime = new Date(next.start_date);
          const hours = startTime.getHours();
          const minutes = startTime.getMinutes();
          response = `Your next event is ${next.title} at ${hours}:${minutes.toString().padStart(2, '0')}`;
        } else {
          response = "You have no upcoming events today";
        }
        break;
      }

      case 'next_prayer': {
        if (userSettings.prayer_enabled) {
          const prayerResponse = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
            date: now.toISOString().split('T')[0],
            latitude: userSettings.latitude,
            longitude: userSettings.longitude
          });
          
          const prayers = prayerResponse.data.prayer_times;
          const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
          
          for (const name of prayerNames) {
            const time = prayers[name];
            if (time) {
              const [hours, minutes] = time.split(':');
              const prayerTime = new Date();
              prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);
              
              if (prayerTime > now) {
                response = `${name} prayer is at ${time}`;
                break;
              }
            }
          }
        } else {
          response = "Prayer times are not enabled in your settings";
        }
        break;
      }

      case 'today_schedule': {
        const today = now.toISOString().split('T')[0];
        const todayEvents = events.filter(e => 
          e.start_date.startsWith(today)
        ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        if (todayEvents.length === 0) {
          response = "You have no events scheduled today";
        } else {
          response = `You have ${todayEvents.length} events today: ${todayEvents.map(e => e.title).join(', ')}`;
        }
        break;
      }

      case 'prayer_times': {
        if (userSettings.prayer_enabled) {
          const prayerResponse = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
            date: now.toISOString().split('T')[0],
            latitude: userSettings.latitude,
            longitude: userSettings.longitude
          });
          
          const prayers = prayerResponse.data.prayer_times;
          response = `Today's prayer times: Fajr ${prayers.Fajr}, Dhuhr ${prayers.Dhuhr}, Asr ${prayers.Asr}, Maghrib ${prayers.Maghrib}, Isha ${prayers.Isha}`;
        } else {
          response = "Prayer times are not enabled";
        }
        break;
      }

      case 'free_time': {
        const todayEvents = events
          .filter(e => e.start_date.startsWith(now.toISOString().split('T')[0]))
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        if (todayEvents.length === 0) {
          response = "Your entire day is free";
        } else {
          const lastEvent = todayEvents[todayEvents.length - 1];
          const endTime = new Date(lastEvent.end_date);
          response = `You'll be free after ${endTime.getHours()}:${endTime.getMinutes().toString().padStart(2, '0')}`;
        }
        break;
      }
    }

    return Response.json({
      success: true,
      intent: parseResult.intent,
      response,
      voice_response: response
    });

  } catch (error) {
    console.error('Voice query error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});