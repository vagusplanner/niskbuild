import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Get event details
    const event = await base44.entities.Event.get(event_id);
    
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get user settings for location
    const settings = await base44.entities.UserSettings.filter({ created_by: user.email });
    const userLocation = settings.length > 0 ? {
      city: settings[0].location_city,
      lat: settings[0].latitude,
      lon: settings[0].longitude
    } : null;

    let reminderMinutes = 30; // Default
    let reminderReason = 'Standard reminder';
    const factors = [];

    // Factor 1: Weather conditions
    if (event.location && userLocation) {
      try {
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lon}&current_weather=true&hourly=temperature_2m,precipitation`
        );
        const weatherData = await weatherResponse.json();
        
        if (weatherData.current_weather) {
          const weather = weatherData.current_weather;
          
          // Bad weather = earlier reminder
          if (weather.precipitation > 5 || weather.windspeed > 30) {
            reminderMinutes += 15;
            factors.push('Bad weather expected - allow extra time');
          }
          
          // Extreme temperatures
          if (weather.temperature < 0 || weather.temperature > 35) {
            reminderMinutes += 10;
            factors.push('Extreme temperature - allow prep time');
          }
        }
      } catch (error) {
        console.error('Weather fetch failed:', error);
      }
    }

    // Factor 2: Travel time estimation
    if (event.location && userLocation) {
      try {
        // Use nominatim to geocode event location
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.location)}&format=json&limit=1`
        );
        const geoData = await geoResponse.json();
        
        if (geoData.length > 0) {
          const destLat = parseFloat(geoData[0].lat);
          const destLon = parseFloat(geoData[0].lon);
          
          // Calculate distance (rough estimate)
          const distance = Math.sqrt(
            Math.pow(destLat - userLocation.lat, 2) + 
            Math.pow(destLon - userLocation.lon, 2)
          ) * 111; // Convert to km
          
          if (distance > 5) {
            const travelTime = Math.ceil(distance / 40 * 60); // Assume 40km/h average
            reminderMinutes += travelTime;
            factors.push(`Travel time: ~${travelTime} minutes (${Math.round(distance)}km)`);
          }
        }
      } catch (error) {
        console.error('Geocoding failed:', error);
      }
    }

    // Factor 3: Event type and preparation needed
    const eventTitle = event.title.toLowerCase();
    if (eventTitle.includes('interview') || eventTitle.includes('presentation')) {
      reminderMinutes += 30;
      factors.push('Important event - extra prep time');
    }
    
    if (eventTitle.includes('workout') || eventTitle.includes('gym')) {
      reminderMinutes += 20;
      factors.push('Workout - time to change and pack');
    }
    
    if (eventTitle.includes('flight') || eventTitle.includes('airport')) {
      reminderMinutes += 120;
      factors.push('Flight - airport arrival time');
    }

    // Factor 4: Time of day
    const eventTime = new Date(event.start_date);
    const hour = eventTime.getHours();
    
    if (hour < 9) {
      reminderMinutes += 15;
      factors.push('Early morning - allow wake-up time');
    }
    
    // Factor 5: Prayer times for Muslim users
    if (settings.length > 0 && settings[0].prayer_enabled) {
      // Check if event is close to prayer time
      factors.push('Prayer time consideration enabled');
      reminderMinutes += 10;
    }

    // Cap maximum reminder time
    reminderMinutes = Math.min(reminderMinutes, 180); // Max 3 hours

    return Response.json({
      success: true,
      event_id,
      recommended_reminder_minutes: reminderMinutes,
      factors_considered: factors,
      reminder_time: new Date(new Date(event.start_date).getTime() - reminderMinutes * 60000).toISOString(),
      summary: `Remind ${reminderMinutes} minutes before (${factors.length} factors considered)`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});