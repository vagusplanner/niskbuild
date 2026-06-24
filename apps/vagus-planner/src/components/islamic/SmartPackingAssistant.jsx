import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, 
  Loader2, 
  Package,
  CheckCircle2,
  Cloud,
  Thermometer,
  Droplets
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartPackingAssistant({ itinerary, startDate, duration, mobilityLevel }) {
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [weather, setWeather] = useState(null);

  const generateSmartList = async () => {
    setLoading(true);
    try {
      // Get weather forecast
      const weatherResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Get current and 7-day weather forecast for Mecca, Saudi Arabia starting from ${startDate}.

Provide:
{
  "current": {
    "temp": temperature in celsius,
    "condition": "sunny/cloudy/rainy/etc",
    "humidity": percentage
  },
  "forecast": {
    "avg_temp": average temperature,
    "max_temp": maximum temperature,
    "min_temp": minimum temperature,
    "rain_chance": percentage,
    "conditions": ["main weather conditions"]
  },
  "recommendations": ["weather-based packing advice"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            current: {
              type: "object",
              properties: {
                temp: { type: "number" },
                condition: { type: "string" },
                humidity: { type: "number" }
              }
            },
            forecast: {
              type: "object",
              properties: {
                avg_temp: { type: "number" },
                max_temp: { type: "number" },
                min_temp: { type: "number" },
                rain_chance: { type: "number" },
                conditions: { type: "array", items: { type: "string" } }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          }
        },
        add_context_from_internet: true
      });

      setWeather(weatherResponse);

      // Generate smart packing list
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a comprehensive, personalized packing list for a Hajj/Umrah pilgrimage.

TRIP DETAILS:
- Duration: ${duration} days
- Start Date: ${startDate}
- Mobility Level: ${mobilityLevel}
- Itinerary includes: ${itinerary?.daily_schedule?.map(d => d.title).join(', ')}

WEATHER CONDITIONS:
- Average temp: ${weatherResponse.forecast.avg_temp}°C
- Max: ${weatherResponse.forecast.max_temp}°C, Min: ${weatherResponse.forecast.min_temp}°C
- Rain chance: ${weatherResponse.forecast.rain_chance}%
- Conditions: ${weatherResponse.forecast.conditions.join(', ')}

Create detailed packing list with categories:
{
  "categories": [
    {
      "name": "Category name",
      "icon": "icon name",
      "priority": "essential|important|optional",
      "items": [
        {
          "item": "Item name",
          "quantity": number or "as needed",
          "reason": "Why needed - consider weather, activities, mobility",
          "essential": boolean
        }
      ]
    }
  ],
  "weather_specific": ["Items specifically for the weather conditions"],
  "mobility_tips": ["Specific tips based on mobility level"],
  "total_weight_estimate": "estimated weight in kg"
}

Categories should include: Religious Items, Clothing (Ihram & regular), Footwear, Health & Medicine, Electronics, Documents, Personal Care, Weather Protection.

Be specific and practical. Consider Saudi Arabia climate, cultural norms, and pilgrimage requirements.`,
        response_json_schema: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  icon: { type: "string" },
                  priority: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        quantity: { type: "string" },
                        reason: { type: "string" },
                        essential: { type: "boolean" }
                      }
                    }
                  }
                }
              }
            },
            weather_specific: { type: "array", items: { type: "string" } },
            mobility_tips: { type: "array", items: { type: "string" } },
            total_weight_estimate: { type: "string" }
          }
        }
      });

      setPackingList(response);
      toast.success('Smart packing list generated!');
    } catch (error) {
      toast.error('Failed to generate packing list');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (categoryIdx, itemIdx) => {
    const key = `${categoryIdx}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const priorityColors = {
    essential: 'bg-rose-100 text-rose-700',
    important: 'bg-amber-100 text-amber-700',
    optional: 'bg-blue-100 text-blue-700'
  };

  return (
    <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-900">
          <Package className="w-5 h-5" />
          AI Smart Packing Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!packingList ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-cyan-900 mb-2">
              Get Weather-Based Packing List
            </h3>
            <p className="text-cyan-700 mb-4 max-w-md mx-auto">
              AI will analyze the weather forecast, your itinerary, and mobility needs to create a personalized packing list
            </p>
            <Button
              onClick={generateSmartList}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Weather & Itinerary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Smart Packing List
                </>
              )}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Weather Summary */}
            {weather && (
              <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    <h3 className="font-semibold">Weather Forecast for Mecca</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-4 h-4" />
                      {weather.forecast.avg_temp}°C
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets className="w-4 h-4" />
                      {weather.forecast.rain_chance}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-blue-50">
                  {weather.forecast.conditions.join(' • ')}
                </div>
              </div>
            )}

            {/* Weather-Specific Items */}
            {packingList.weather_specific?.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Weather-Based Recommendations
                </h4>
                <ul className="space-y-1">
                  {packingList.weather_specific.map((item, idx) => (
                    <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobility Tips */}
            {packingList.mobility_tips?.length > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-semibold text-emerald-900 mb-2">
                  Mobility-Specific Tips
                </h4>
                <ul className="space-y-1">
                  {packingList.mobility_tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-emerald-800 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Packing Categories */}
            <div className="space-y-4">
              {packingList.categories?.map((category, catIdx) => (
                <Card key={catIdx} className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>{category.name}</span>
                        <Badge className={priorityColors[category.priority]}>
                          {category.priority}
                        </Badge>
                      </CardTitle>
                      <span className="text-sm text-slate-500">
                        {category.items.filter((_, i) => checkedItems[`${catIdx}-${i}`]).length}/{category.items.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {category.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Checkbox
                          checked={checkedItems[`${catIdx}-${itemIdx}`] || false}
                          onCheckedChange={() => toggleItem(catIdx, itemIdx)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${checkedItems[`${catIdx}-${itemIdx}`] ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {item.item}
                            </span>
                            {item.essential && (
                              <Badge variant="outline" className="text-rose-600 border-rose-300 text-xs">
                                Essential
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.quantity}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-100 rounded-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Estimated Total Weight:</span>
                <span className="font-semibold text-slate-800">{packingList.total_weight_estimate}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Items Packed:</span>
                <span className="font-semibold text-emerald-600">
                  {Object.values(checkedItems).filter(Boolean).length} / {packingList.categories?.reduce((sum, cat) => sum + cat.items.length, 0)}
                </span>
              </div>
            </div>

            <Button
              onClick={generateSmartList}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate with Latest Weather
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}