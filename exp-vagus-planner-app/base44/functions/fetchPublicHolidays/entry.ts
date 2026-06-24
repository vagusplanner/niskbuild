import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { countryCode, year } = body;

    if (!countryCode || !year) {
      return Response.json({ error: 'countryCode and year are required' }, { status: 400 });
    }

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`;
    const res = await fetch(url);

    if (!res.ok) {
      return Response.json({ error: `No holiday data for ${countryCode}` }, { status: 404 });
    }

    const holidays = await res.json();

    // Return simplified list
    const result = holidays.map(h => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      countryCode: h.countryCode,
      type: h.types?.[0] || 'Public',
    }));

    return Response.json({ holidays: result });
  } catch (error) {
    console.error('fetchPublicHolidays error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});