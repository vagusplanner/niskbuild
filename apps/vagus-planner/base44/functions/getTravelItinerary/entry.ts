import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { destination, lat, lng, date } = await req.json();
    if (!destination) return Response.json({ error: 'destination required' }, { status: 400 });

    const targetDate = date || new Date().toISOString().split('T')[0];
    const [year, month, day] = targetDate.split('-');

    // ── 1. Prayer times via AlAdhan API ───────────────────────────────────────
    let prayerTimes = null;
    let qiblaDirection = null;

    if (lat && lng) {
      try {
        const ptRes = await fetch(
          `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`
        );
        const ptData = await ptRes.json();
        if (ptData.code === 200) {
          const t = ptData.data.timings;
          prayerTimes = {
            Fajr: t.Fajr,
            Sunrise: t.Sunrise,
            Dhuhr: t.Dhuhr,
            Asr: t.Asr,
            Maghrib: t.Maghrib,
            Isha: t.Isha,
          };
        }
      } catch (e) {
        console.error('AlAdhan prayer times error:', e.message);
      }

      // Qibla direction
      try {
        const qRes = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
        const qData = await qRes.json();
        if (qData.code === 200) {
          qiblaDirection = Math.round(qData.data.direction);
        }
      } catch (e) {
        console.error('Qibla API error:', e.message);
      }
    }

    // ── 2. Halal activities + restaurants via AI + internet ───────────────────
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a Muslim-friendly travel advisor. For the destination "${destination}", suggest:
1. 5 halal-certified or Muslim-friendly restaurants (real places, highly rated)
2. 5 must-see activities/attractions suitable for Muslim travelers (halal, modest, family-friendly)
3. 2 nearby mosques or Islamic centres

Be specific with real place names. Include brief descriptions.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          restaurants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                cuisine: { type: 'string' },
                description: { type: 'string' },
                rating: { type: 'number' },
                price_range: { type: 'string' },
                address: { type: 'string' }
              }
            }
          },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' },
                suitable_for: { type: 'string' }
              }
            }
          },
          mosques: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                note: { type: 'string' }
              }
            }
          },
          travel_tips: { type: 'string' }
        }
      },
      model: 'gemini_3_flash'
    });

    console.log(`Travel itinerary built for ${destination}: ${aiResult?.restaurants?.length || 0} restaurants, ${aiResult?.activities?.length || 0} activities`);

    return Response.json({
      destination,
      date: targetDate,
      prayer_times: prayerTimes,
      qibla_direction: qiblaDirection,
      restaurants: aiResult?.restaurants || [],
      activities: aiResult?.activities || [],
      mosques: aiResult?.mosques || [],
      travel_tips: aiResult?.travel_tips || '',
    });

  } catch (error) {
    console.error('getTravelItinerary error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});