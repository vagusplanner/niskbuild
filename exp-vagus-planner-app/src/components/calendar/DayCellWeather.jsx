import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { format } from 'date-fns';

export default function DayCellWeather({ day, userSettings }) {
  const [location, setLocation] = React.useState({
    lat: userSettings?.latitude || null,
    lon: userSettings?.longitude || null,
  });

  React.useEffect(() => {
    if (!location.lat || !location.lon) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setLocation({ lat: 51.5074, lon: -0.1278 })
      );
    }
  }, []);

  const { data: weather } = useQuery({
    queryKey: ['weather-cell', format(day, 'yyyy-MM-dd'), location.lat, location.lon],
    queryFn: async () => {
      const res = await SDK.functions.invoke('getWeatherForecast', {
        latitude: location.lat,
        longitude: location.lon,
        date: format(day, 'yyyy-MM-dd'),
      });
      return res.data;
    },
    enabled: !!location.lat && !!location.lon,
    staleTime: 1000 * 60 * 60,
  });

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 dark:text-blue-400">
      <span>{weather.icon}</span>
      <span>{weather.temperature_min}°-{weather.temperature_max}°{weather.unit}</span>
      {weather.precipitation_probability > 30 && (
        <span className="text-blue-400">{weather.precipitation_probability}%💧</span>
      )}
    </div>
  );
}