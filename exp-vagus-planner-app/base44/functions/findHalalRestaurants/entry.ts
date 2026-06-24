import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload = {};
    try { payload = await req.json(); } catch (_) {}

    const { lat, lng, query = '' } = payload;

    if (!lat || !lng) {
      return Response.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const searchTerm = query
      ? `halal ${query} restaurant`
      : 'halal restaurant';

    // Use Google Maps Places Text Search API via InvokeLLM with internet context
    // Fallback: use Overpass API (OpenStreetMap) which is free and reliable
    // Primary: use Google Places via LLM with internet search
    const prompt = `
Search for halal restaurants near coordinates (latitude: ${lat}, longitude: ${lng}).
${query ? `Focus on: ${query}` : ''}

Find up to 10 nearby halal-certified or halal-friendly restaurants.
Return ONLY a JSON object (no markdown, no extra text) in this exact format:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "address": "Full street address",
      "cuisine": "Type of cuisine e.g. Burger, Biryani, Shawarma",
      "rating": 4.5,
      "distance": "0.3 km",
      "phone": "+44 20 1234 5678",
      "website": "https://...",
      "hours": "Mon-Sun 11am-11pm",
      "open_now": true
    }
  ]
}
Use real business data from Google Maps, Yelp or TripAdvisor for this location.
Only include restaurants that are halal-certified or known to serve halal food.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          restaurants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:     { type: 'string' },
                address:  { type: 'string' },
                cuisine:  { type: 'string' },
                rating:   { type: 'number' },
                distance: { type: 'string' },
                phone:    { type: 'string' },
                website:  { type: 'string' },
                hours:    { type: 'string' },
                open_now: { type: 'boolean' }
              }
            }
          }
        }
      }
    });

    return Response.json({ restaurants: result?.restaurants || [] });
  } catch (error) {
    console.error('findHalalRestaurants error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});