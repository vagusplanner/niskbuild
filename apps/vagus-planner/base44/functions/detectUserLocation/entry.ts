import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client IP from request headers
    const clientIP = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip');

    let locationData = null;
    let error = null;

    // Try multiple geolocation APIs for better accuracy
    try {
      // Primary: ipapi.co (more reliable and includes currency)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (!data.error && data.country_name) {
        locationData = {
          country_name: data.country_name,
          country_code: data.country_code,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          currency: data.currency
        };
      }
    } catch (e) {
      error = e.message;
    }

    // Fallback: ip-api.com
    if (!locationData && clientIP) {
      try {
        const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode,city,lat,lon,timezone,currency`);
        const data = await response.json();
        
        if (data.status === 'success') {
          locationData = {
            country_name: data.country,
            country_code: data.countryCode,
            city: data.city,
            latitude: data.lat,
            longitude: data.lon,
            timezone: data.timezone,
            currency: data.currency
          };
        }
      } catch (e) {
        error = error || e.message;
      }
    }

    if (!locationData) {
      return Response.json({ 
        error: 'Could not detect location. Please set manually.',
        details: error 
      }, { status: 400 });
    }

    // Get detailed country info including currency symbol and correct currency code
    let countryInfo;
    let currency = locationData.currency;
    let currencySymbol = '$';
    let languages = ['English'];
    
    try {
      const currencyResponse = await fetch(`https://restcountries.com/v3.1/alpha/${locationData.country_code}`);
      const countryData = await currencyResponse.json();
      countryInfo = countryData[0];

      // Get primary currency from country data (more accurate)
      const currencies = countryInfo.currencies || {};
      const currencyCodes = Object.keys(currencies);
      
      if (currencyCodes.length > 0) {
        currency = currencyCodes[0];
        currencySymbol = currencies[currency]?.symbol || '$';
      }
      
      languages = countryInfo.languages ? Object.values(countryInfo.languages) : ['English'];
    } catch (e) {
      // Use currency from IP API if country API fails
      currency = locationData.currency || 'USD';
    }
    
    const primaryLanguage = languages[0].toLowerCase().split(' ')[0];

    // Map language to locale code
    const languageMap = {
      'english': 'en',
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'arabic': 'ar',
      'chinese': 'zh',
      'japanese': 'ja',
      'korean': 'ko',
      'russian': 'ru',
      'dutch': 'nl',
      'polish': 'pl',
      'turkish': 'tr',
      'hindi': 'hi',
      'urdu': 'ur'
    };

    const languageCode = languageMap[primaryLanguage] || 'en';

    // Determine date format by region
    let dateFormat = 'DD/MM/YYYY'; // Default international
    if (locationData.country_code === 'US') {
      dateFormat = 'MM/DD/YYYY';
    } else if (['CN', 'JP', 'KR', 'TW'].includes(locationData.country_code)) {
      dateFormat = 'YYYY-MM-DD';
    }

    // Update or create user settings
    const existingSettings = await base44.entities.UserSettings.filter({ created_by: user.email });
    
    const settingsData = {
      location_city: locationData.city,
      location_country: locationData.country_name,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timezone: locationData.timezone,
      currency: currency,
      currency_symbol: currencySymbol,
      country_code: locationData.country_code,
      language: languageCode,
      date_format: dateFormat
    };

    if (existingSettings.length > 0) {
      await base44.entities.UserSettings.update(existingSettings[0].id, settingsData);
    } else {
      await base44.entities.UserSettings.create(settingsData);
    }

    return Response.json({
      success: true,
      location: {
        city: locationData.city,
        country: locationData.country_name,
        country_code: locationData.country_code,
        timezone: locationData.timezone
      },
      currency: {
        code: currency,
        symbol: currencySymbol
      },
      language: languageCode,
      date_format: dateFormat
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});