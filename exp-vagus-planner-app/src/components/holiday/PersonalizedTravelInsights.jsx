import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Sparkles, Loader2, Package2, Compass, UtensilsCrossed, 
  Lightbulb, MapPin, CheckCircle, AlertCircle, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PersonalizedTravelInsights({ holiday }) {
  const [themes, setThemes] = useState(null);
  const [packing, setPacking] = useState(null);
  const [experiences, setExperiences] = useState(null);
  const [restaurants, setRestaurants] = useState(null);
  const [loading, setLoading] = useState({});

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => SDK.entities.Holiday.list('-start_date')
  });

  const userSettings = settings[0] || {};

  const generateInsights = async (type) => {
    if (!holiday) {
      toast.error('No holiday selected');
      return;
    }
    
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const userData = {
        travel_interests: userSettings.travel_interests || [],
        dietary_preferences: userSettings.dietary_preferences || [],
        past_holidays: holidays.filter(h => h.status === 'completed').slice(0, 5),
        budget_range: holiday.budget ? `$${holiday.budget}` : 'moderate',
        duration: Math.ceil((new Date(holiday.end_date) - new Date(holiday.start_date)) / (1000 * 60 * 60 * 24))
      };

      const { data } = await SDK.functions.invoke('generatePersonalizedTravel', {
        type,
        destination: holiday.destination,
        userData
      });

      if (type === 'themes') setThemes(data.themes);
      else if (type === 'packing') setPacking(data.categories);
      else if (type === 'experiences') setExperiences(data.experiences);
      else if (type === 'restaurants') setRestaurants(data.restaurants);
    } catch (error) {
      toast.error(`Failed to generate ${type}`);
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  if (!holiday) {
    return (
      <Card className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-600">Personalized Travel Insights</h3>
        </div>
        <p className="text-sm text-slate-500">Select a holiday to get personalized insights</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-teal-600" />
        <h3 className="font-semibold text-slate-800">Personalized Travel Insights</h3>
      </div>

      <Tabs defaultValue="themes" className="space-y-3">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="themes" className="text-xs">
            <Lightbulb className="w-3 h-3 mr-1" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="packing" className="text-xs">
            <Package2 className="w-3 h-3 mr-1" />
            Packing
          </TabsTrigger>
          <TabsTrigger value="experiences" className="text-xs">
            <Compass className="w-3 h-3 mr-1" />
            Hidden Gems
          </TabsTrigger>
          <TabsTrigger value="restaurants" className="text-xs">
            <UtensilsCrossed className="w-3 h-3 mr-1" />
            Restaurants
          </TabsTrigger>
        </TabsList>

        {/* Themes */}
        <TabsContent value="themes" className="mt-0">
          {!themes ? (
            <div className="text-center py-6">
              <Lightbulb className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-slate-600 mb-3">
                Get AI-suggested thematic trip ideas based on your interests
              </p>
              <Button
                size="sm"
                onClick={() => generateInsights('themes')}
                disabled={loading.themes}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading.themes ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Themes'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {themes.map((theme, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white rounded-lg border border-teal-100"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-slate-800 text-sm">{theme.theme}</h4>
                    <Badge className="bg-teal-100 text-teal-700 text-xs">{theme.best_season}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{theme.description}</p>
                  {theme.destinations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {theme.destinations.map((dest, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          {dest}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{theme.estimated_budget}</p>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Packing List */}
        <TabsContent value="packing" className="mt-0">
          {!packing ? (
            <div className="text-center py-6">
              <Package2 className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-slate-600 mb-3">
                Get a personalized packing list for {holiday.destination}
              </p>
              <Button
                size="sm"
                onClick={() => generateInsights('packing')}
                disabled={loading.packing}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading.packing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Packing List'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {packing.map((category, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-teal-100">
                  <h4 className="font-medium text-slate-800 text-sm mb-2">{category.category}</h4>
                  <div className="space-y-1">
                    {category.items?.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {item.essential ? (
                          <AlertCircle className="w-3 h-3 text-red-500 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-slate-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <span className={item.essential ? 'font-medium text-slate-800' : 'text-slate-600'}>
                            {item.item}
                          </span>
                          {item.note && (
                            <p className="text-slate-500 italic">{item.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Local Experiences */}
        <TabsContent value="experiences" className="mt-0">
          {!experiences ? (
            <div className="text-center py-6">
              <Compass className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-slate-600 mb-3">
                Discover hidden gems and local experiences
              </p>
              <Button
                size="sm"
                onClick={() => generateInsights('experiences')}
                disabled={loading.experiences}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading.experiences ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Hidden Gems'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {experiences.map((exp, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white rounded-lg border border-teal-100"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-slate-800 text-sm">{exp.name}</h4>
                    <Badge className="bg-teal-100 text-teal-700 text-xs">{exp.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{exp.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{exp.estimated_cost}</span>
                  </div>
                  {exp.insider_tip && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                      <p className="text-xs text-amber-700">
                        <Lightbulb className="w-3 h-3 inline mr-1" />
                        <span className="font-medium">Insider Tip:</span> {exp.insider_tip}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Restaurants */}
        <TabsContent value="restaurants" className="mt-0">
          {!restaurants ? (
            <div className="text-center py-6">
              <UtensilsCrossed className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-slate-600 mb-3">
                Get personalized restaurant recommendations
              </p>
              <Button
                size="sm"
                onClick={() => generateInsights('restaurants')}
                disabled={loading.restaurants}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {loading.restaurants ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Restaurants'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {restaurants.map((restaurant, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white rounded-lg border border-teal-100"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h4 className="font-medium text-slate-800 text-sm">{restaurant.name}</h4>
                      <p className="text-xs text-slate-500">{restaurant.cuisine}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(restaurant.price_range?.length || 2)].map((_, i) => (
                        <span key={i} className="text-green-600">$</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">
                    <span className="font-medium">Specialty:</span> {restaurant.specialty}
                  </p>
                  <p className="text-xs text-slate-600 mb-2">
                    <span className="font-medium">Vibe:</span> {restaurant.atmosphere}
                  </p>
                  <div className="p-2 bg-teal-50 rounded border border-teal-100">
                    <p className="text-xs text-teal-700">
                      <Star className="w-3 h-3 inline mr-1 fill-teal-700" />
                      {restaurant.recommendation}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}