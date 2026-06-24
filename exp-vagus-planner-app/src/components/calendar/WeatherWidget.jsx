import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card } from '@/components/ui/card';
import { Cloud, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function WeatherWidget({ date, latitude, longitude }) {
  const [location, setLocation] = useState({ lat: latitude, lon: longitude });

  useEffect(() => {
    if (!latitude || !longitude) {
      // Get user's location
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          // Default to London if location access denied
          setLocation({ lat: 51.5074, lon: -0.1278 });
        }
      );
    }
  }, [latitude, longitude]);

  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather', date, location.lat, location.lon],
    queryFn: async () => {
      const response = await SDK.functions.invoke('getWeatherForecast', {
        latitude: location.lat,
        longitude: location.lon,
        date: format(new Date(date), 'yyyy-MM-dd')
      });
      return response.data;
    },
    enabled: !!location.lat && !!location.lon,
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-xs text-blue-600 dark:text-blue-400">Loading weather...</span>
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weather.icon}</span>
          <div>
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {weather.description}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {weather.temperature_min}° - {weather.temperature_max}°{weather.unit}
            </p>
          </div>
        </div>
        {weather.precipitation_probability > 30 && (
          <div className="text-right">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {weather.precipitation_probability}%
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-500">rain</p>
          </div>
        )}
      </div>
    </Card>
  );
}