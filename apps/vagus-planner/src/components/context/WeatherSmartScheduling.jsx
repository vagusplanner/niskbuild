import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, CloudRain, Sun, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function WeatherSmartScheduling() {
  const [weather, setWeather] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  // Get user location and weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        try {
          // Fetch weather data
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,temperature&forecast_days=1`
          );
          const data = await response.json();
          setWeather(data.current);

          // Generate suggestions
          await generateSuggestions(data.current);
        } catch (err) {
          console.error('Failed to fetch weather:', err);
        }
      });
    }
  }, []);

  const generateSuggestions = async (weatherData) => {
    const outdoorEvents = events.filter(e => 
      ['personal', 'health', 'social'].includes(e.category) && !e.is_all_day
    );

    const isRainy = [45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82].includes(weatherData.weather_code);
    const isCold = weatherData.temperature < 10;

    const newSuggestions = [];

    if (isRainy && outdoorEvents.length > 0) {
      newSuggestions.push({
        id: 1,
        icon: CloudRain,
        title: 'Rainy Weather Ahead',
        message: `Consider moving outdoor activities indoors (${outdoorEvents.length} events)`,
        severity: 'warning',
        action: 'Review Events'
      });
    }

    if (isCold && outdoorEvents.length > 0) {
      newSuggestions.push({
        id: 2,
        icon: Cloud,
        title: 'Cold Weather Alert',
        message: `Plan indoor alternatives for outdoor activities`,
        severity: 'info',
        action: 'Reschedule'
      });
    }

    if (!isRainy && weatherData.weather_code < 3) {
      newSuggestions.push({
        id: 3,
        icon: Sun,
        title: 'Great Weather for Outdoors',
        message: `Perfect time for outdoor activities or exercise`,
        severity: 'success',
        action: 'Plan Activity'
      });
    }

    setSuggestions(newSuggestions);
  };

  const getWeatherIcon = () => {
    if (!weather) return null;
    const code = weather.weather_code;
    if (code === 0) return <Sun className="w-5 h-5 text-yellow-500" />;
    if ([1, 2].includes(code)) return <Cloud className="w-5 h-5 text-gray-500" />;
    return <CloudRain className="w-5 h-5 text-blue-500" />;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getWeatherIcon()}
            Weather-Smart Scheduling
          </CardTitle>
          <CardDescription>Activity suggestions based on weather forecast</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weather && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {Math.round(weather.temperature)}°C - {weather.weather_code === 0 ? 'Clear' : 'Cloudy'}
              </p>
            </div>
          )}

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map(suggestion => {
                const Icon = suggestion.icon;
                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      suggestion.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' :
                      suggestion.severity === 'success' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                      'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                      suggestion.severity === 'warning' ? 'text-amber-600' :
                      suggestion.severity === 'success' ? 'text-green-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{suggestion.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{suggestion.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading weather suggestions...</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}