import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, date } = await req.json();

    // Use Open-Meteo free weather API (no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=auto&forecast_days=14`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Weather code mapping
    const weatherCodeMap = {
      0: { description: 'Clear sky', icon: '☀️' },
      1: { description: 'Mainly clear', icon: '🌤️' },
      2: { description: 'Partly cloudy', icon: '⛅' },
      3: { description: 'Overcast', icon: '☁️' },
      45: { description: 'Foggy', icon: '🌫️' },
      48: { description: 'Foggy', icon: '🌫️' },
      51: { description: 'Light drizzle', icon: '🌦️' },
      61: { description: 'Light rain', icon: '🌧️' },
      63: { description: 'Moderate rain', icon: '🌧️' },
      65: { description: 'Heavy rain', icon: '⛈️' },
      71: { description: 'Light snow', icon: '🌨️' },
      73: { description: 'Moderate snow', icon: '❄️' },
      75: { description: 'Heavy snow', icon: '❄️' },
      95: { description: 'Thunderstorm', icon: '⛈️' }
    };

    // Find the forecast for the requested date
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dateIndex = data.daily.time.indexOf(targetDate);

    if (dateIndex === -1) {
      return Response.json({ 
        error: 'No forecast available for this date' 
      }, { status: 404 });
    }

    const weatherCode = data.daily.weathercode[dateIndex];
    const weather = weatherCodeMap[weatherCode] || { description: 'Unknown', icon: '🌡️' };

    return Response.json({
      date: targetDate,
      temperature_max: Math.round(data.daily.temperature_2m_max[dateIndex]),
      temperature_min: Math.round(data.daily.temperature_2m_min[dateIndex]),
      precipitation_probability: data.daily.precipitation_probability_max[dateIndex],
      description: weather.description,
      icon: weather.icon,
      unit: '°C'
    });

  } catch (error) {
    console.error('Weather forecast error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});