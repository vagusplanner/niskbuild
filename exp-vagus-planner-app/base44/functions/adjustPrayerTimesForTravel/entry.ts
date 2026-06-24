import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, start_date, end_date } = await req.json();

    // Get coordinates for destination
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'VagusPlanner/1.0'
        }
      }
    );

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      return Response.json({ error: 'Could not find destination coordinates' }, { status: 400 });
    }

    const { lat, lon, display_name } = geocodeData[0];

    // Create or update prayer time adjustment record
    const adjustments = await base44.asServiceRole.entities.PrayerTimeAdjustment.list();
    
    const existingAdjustment = adjustments.find(a => 
      a.created_by === user.email && 
      a.start_date === start_date && 
      a.end_date === end_date
    );

    const adjustmentData = {
      location: display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      start_date,
      end_date,
      is_active: true
    };

    if (existingAdjustment) {
      await base44.asServiceRole.entities.PrayerTimeAdjustment.update(
        existingAdjustment.id,
        adjustmentData
      );
    } else {
      await base44.asServiceRole.entities.PrayerTimeAdjustment.create(adjustmentData);
    }

    // Get prayer times for first day as preview
    const month = new Date(start_date).getMonth() + 1;
    const year = new Date(start_date).getFullYear();

    const prayerResponse = await fetch(
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=2`
    );

    const prayerData = await prayerResponse.json();
    const firstDayPrayers = prayerData.data?.[0]?.timings;

    return Response.json({ 
      success: true,
      location: display_name,
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      sample_prayer_times: firstDayPrayers,
      message: `Prayer times will be automatically adjusted for ${display_name} during your trip`
    });

  } catch (error) {
    console.error('Error adjusting prayer times:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});