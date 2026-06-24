import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { device_type, auth_token } = await req.json();

    // Get user settings to check last sync
    const settings = await base44.entities.UserSettings.list();
    const userSettings = settings[0] || {};

    let syncedData = {
      exercise: [],
      sleep: [],
      heart_rate: [],
      steps: 0
    };

    // Simulate device API integration
    // In production, use actual OAuth and API calls to Fitbit, Apple Health, Garmin APIs
    if (device_type === 'fitbit') {
      // Mock Fitbit API response
      syncedData = {
        exercise: [
          { activity_type: 'Running', duration: 35, intensity: 'high', calories_burned: 320, date: new Date().toISOString() },
          { activity_type: 'Walking', duration: 45, intensity: 'low', calories_burned: 180, date: new Date(Date.now() - 86400000).toISOString() }
        ],
        sleep: [
          { hours_slept: 7.5, quality: 'good', sleep_start: '23:00', sleep_end: '06:30', deep_sleep_minutes: 120, rem_minutes: 90 }
        ],
        steps: 8542,
        heart_rate_avg: 72
      };
    } else if (device_type === 'apple_watch') {
      syncedData = {
        exercise: [
          { activity_type: 'Cycling', duration: 40, intensity: 'moderate', calories_burned: 280, date: new Date().toISOString() }
        ],
        sleep: [
          { hours_slept: 8, quality: 'excellent', sleep_start: '22:30', sleep_end: '06:30', deep_sleep_minutes: 150, rem_minutes: 110 }
        ],
        steps: 10234,
        heart_rate_avg: 68
      };
    } else if (device_type === 'garmin') {
      syncedData = {
        exercise: [
          { activity_type: 'Swimming', duration: 50, intensity: 'high', calories_burned: 400, date: new Date().toISOString() }
        ],
        sleep: [
          { hours_slept: 7, quality: 'fair', sleep_start: '23:30', sleep_end: '06:30', deep_sleep_minutes: 100, rem_minutes: 85 }
        ],
        steps: 9876,
        heart_rate_avg: 70
      };
    }

    // Import exercise data
    for (const exercise of syncedData.exercise) {
      // Check if already exists to avoid duplicates
      const existing = await base44.asServiceRole.entities.Exercise.filter({
        activity_type: exercise.activity_type,
        created_date: { $gte: new Date(Date.now() - 86400000).toISOString() }
      });

      if (existing.length === 0) {
        await base44.entities.Exercise.create({
          ...exercise,
          source: device_type
        });
      }
    }

    // Import sleep data
    for (const sleep of syncedData.sleep) {
      const sleepDate = new Date().toISOString().split('T')[0];
      const existing = await base44.asServiceRole.entities.Sleep.filter({
        created_date: { $gte: sleepDate }
      });

      if (existing.length === 0) {
        await base44.entities.Sleep.create({
          date: sleepDate,
          ...sleep,
          source: device_type
        });
      }
    }

    // Log energy if heart rate data available
    if (syncedData.heart_rate_avg) {
      const today = new Date().toISOString().split('T')[0];
      const existingEnergy = await base44.asServiceRole.entities.EnergyLog.filter({
        date: today
      });

      if (existingEnergy.length === 0) {
        await base44.entities.EnergyLog.create({
          date: today,
          level: syncedData.heart_rate_avg < 70 ? 'high' : syncedData.heart_rate_avg < 80 ? 'medium' : 'low',
          notes: `Avg heart rate: ${syncedData.heart_rate_avg} bpm (from ${device_type})`,
          source: device_type
        });
      }
    }

    // Update last sync time in settings
    if (userSettings.id) {
      await base44.entities.UserSettings.update(userSettings.id, {
        [`last_${device_type}_sync`]: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      synced_items: {
        exercise: syncedData.exercise.length,
        sleep: syncedData.sleep.length,
        steps: syncedData.steps,
        heart_rate: syncedData.heart_rate_avg
      },
      message: `Successfully synced ${syncedData.exercise.length} workouts, ${syncedData.sleep.length} sleep records from ${device_type}`
    });

  } catch (error) {
    console.error('Wearable sync error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});