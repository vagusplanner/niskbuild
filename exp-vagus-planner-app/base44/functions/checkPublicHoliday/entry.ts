import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, country = 'US' } = await req.json();

    // Fetch user settings for location
    const settings = await base44.entities.UserSettings.list();
    const userCountry = settings[0]?.location_country || country;

    // Use AI to check if it's a public holiday
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Is ${date} a public holiday in ${userCountry}? 
      
Consider national holidays, bank holidays, and major observances.
Return true if it's a holiday, false otherwise.
Also provide the holiday name if it is one.`,
      response_json_schema: {
        type: "object",
        properties: {
          is_holiday: { type: "boolean" },
          holiday_name: { type: "string" },
          is_bank_holiday: { type: "boolean" },
          description: { type: "string" }
        }
      }
    });

    return Response.json({
      date,
      country: userCountry,
      ...result
    });

  } catch (error) {
    console.error('Error checking holiday:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});