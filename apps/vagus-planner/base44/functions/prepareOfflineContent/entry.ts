import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_types = ['all'] } = await req.json();

    const offlineContent = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      content: {}
    };

    // Fetch holidays for itineraries
    if (content_types.includes('all') || content_types.includes('itineraries')) {
      try {
        const holidays = await base44.entities.Holiday.filter({
          created_by: user.email
        });
        offlineContent.content.itineraries = holidays.map(h => ({
          id: h.id,
          title: h.title,
          destination: h.destination,
          start_date: h.start_date,
          end_date: h.end_date,
          budget: h.budget,
          status: h.status,
          notes: h.notes,
          accommodation: h.accommodation,
          flight_details: h.flight_details,
          cities: h.cities,
          visa_requirements: h.visa_requirements
        }));
      } catch (error) {
        offlineContent.content.itineraries = [];
      }
    }

    // Fetch prayer times and settings
    if (content_types.includes('all') || content_types.includes('prayerTimes')) {
      try {
        const settings = await base44.entities.UserSettings.filter({
          created_by: user.email
        });
        offlineContent.content.prayerTimes = {
          settings: settings[0] || {},
          cached_times: await generatePrayerTimesCache()
        };
      } catch (error) {
        offlineContent.content.prayerTimes = {};
      }
    }

    // Fetch ritual guides
    if (content_types.includes('all') || content_types.includes('ritualGuides')) {
      offlineContent.content.ritualGuides = await getRitualGuidesContent();
    }

    // Generate concierge offline info
    if (content_types.includes('all') || content_types.includes('concierge')) {
      offlineContent.content.concierge = {
        faqs: await getConciergeOfflineInfo(),
        last_updated: new Date().toISOString()
      };
    }

    return Response.json({
      success: true,
      content: offlineContent,
      size_estimate_kb: JSON.stringify(offlineContent).length / 1024
    });
  } catch (error) {
    console.error('Offline content preparation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generatePrayerTimesCache() {
  // Generate prayer times for next 90 days
  const times = [];
  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    times.push({
      date: date.toISOString().split('T')[0],
      fajr: '05:30',
      sunrise: '06:45',
      dhuhr: '12:15',
      asr: '15:30',
      maghrib: '18:20',
      isha: '19:45'
    });
  }

  return times;
}

async function getRitualGuidesContent() {
  return {
    umrah_steps: [
      {
        step: 1,
        title: 'Ihraam (Assuming Pilgrimage State)',
        description: 'Enter the sacred state with intention',
        duration_minutes: 60,
        key_points: [
          'Make intention (niyyah) for Umrah',
          'Wear ihraam garments',
          'Avoid prohibited actions',
          'Recite Talbiyah'
        ]
      },
      {
        step: 2,
        title: 'Tawaf (Circumambulation)',
        description: 'Walk around the Kaaba 7 times',
        duration_minutes: 45,
        key_points: [
          'Start at Hajjr-e-Aswad (Black Stone)',
          'Circumambulate counter-clockwise',
          'Complete 7 rounds',
          'Optional: Raml (running) in first 3 rounds'
        ]
      },
      {
        step: 3,
        title: 'Salah (Prayer)',
        description: 'Pray 2 Rakahs behind Maqaam Ibrahim',
        duration_minutes: 15,
        key_points: [
          'Pray behind the Maqaam if possible',
          '2 Rakahs for Tawaf',
          'Drink Zamzam water'
        ]
      },
      {
        step: 4,
        title: 'Sai (Walking)',
        description: 'Walk between Safa and Marwa 7 times',
        duration_minutes: 60,
        key_points: [
          'Start at mount Safa',
          'Walk to Marwa',
          'Complete 7 rounds',
          'Optional: Running in some sections'
        ]
      },
      {
        step: 5,
        title: 'Hair Cutting/Shaving',
        description: 'Complete Umrah by cutting hair',
        duration_minutes: 20,
        key_points: [
          'Cut or shave hair',
          'Exit Ihraam state',
          'Umrah complete'
        ]
      }
    ],
    hajj_steps: [
      {
        step: 1,
        title: 'Ihraam',
        description: 'Enter sacred state from Miqat',
        duration_minutes: 120
      },
      {
        step: 2,
        title: 'Tawaf al-Qudoom',
        description: 'Welcoming circumambulation',
        duration_minutes: 60
      },
      {
        step: 3,
        title: 'Stay in Arafah',
        description: 'Stand at Mount Arafah',
        duration_minutes: 1440
      },
      {
        step: 4,
        title: 'Muzdalifa',
        description: 'Gather at Muzdalifa',
        duration_minutes: 480
      },
      {
        step: 5,
        title: 'Mina and Jamarat',
        description: 'Stone the pillars',
        duration_minutes: 720
      },
      {
        step: 6,
        title: 'Tawaf al-Ifadah',
        description: 'Circumambulation of return',
        duration_minutes: 90
      }
    ],
    important_duas: [
      {
        arabic: 'لبيك اللهم لبيك',
        transliteration: 'Labbaik Allahumma Labbaik',
        translation: 'Here I am, O Allah, here I am',
        when_to_recite: 'During Ihraam and throughout pilgrimage'
      },
      {
        arabic: 'اللهم اني أسألك العفو والعافية',
        transliteration: 'Allahumma inni as\'aluka al-\'afwa wa al-\'afiyah',
        translation: 'O Allah, I ask You for pardon and well-being',
        when_to_recite: 'Throughout pilgrimage'
      }
    ]
  };
}

async function getConciergeOfflineInfo() {
  return {
    essential_numbers: {
      ambulance: '997',
      fire: '998',
      police: '999',
      tourism_info: '+966 12 548 6200'
    },
    facilities: {
      water_stations: 'Available throughout the holy areas',
      medical_centers: 'Present at major ritual sites',
      bathrooms: 'Public facilities at Haram entrance',
      luggage_storage: 'Available at hotels'
    },
    weather_tips: {
      summer_hajj: 'Stay hydrated, use umbrella, light colored clothing',
      winter_hajj: 'Layers recommended, early mornings are cool',
      always: 'Avoid peak sun hours (11 AM - 3 PM)'
    },
    crowd_management: {
      best_times_tawaf: 'Late night (11 PM - 3 AM) or early morning (4-6 AM)',
      best_times_sai: 'Mid-morning (9-10 AM) or afternoon (4-6 PM)',
      peak_hours: 'Zuhr and Asr times are busiest'
    },
    cultural_tips: [
      'Respect the sacred space',
      'Be patient with crowds',
      'Help fellow pilgrims',
      'Learn basic Arabic phrases',
      'Understand local customs'
    ],
    emergency_contacts: {
      embassy_usa: '+966 11 488 3800',
      embassy_uk: '+966 11 488 0077',
      embassy_canada: '+966 11 419 5200'
    }
  };
}