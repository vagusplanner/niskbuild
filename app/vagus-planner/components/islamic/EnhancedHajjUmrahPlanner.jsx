import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plane, 
  Calendar, 
  BookOpen, 
  Package, 
  Navigation, 
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function EnhancedHajjUmrahPlanner() {
  const [pilgrimageType, setPilgrimageType] = useState('Umrah');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [activeTab, setActiveTab] = useState('itinerary');
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedRitual, setExpandedRitual] = useState(null);
  const [selectedRitual, setSelectedRitual] = useState('Tawaf');
  const [selectedStage, setSelectedStage] = useState('entering_makkah');
  const [navigationFrom, setNavigationFrom] = useState('');
  const [navigationTo, setNavigationTo] = useState('');
  const queryClient = useQueryClient();

  // Generate complete itinerary
  const generateItinerary = useMutation({
    mutationFn: async () => {
      if (!departureDate || !returnDate) {
        throw new Error('Please select travel dates');
      }

      const response = await base44.functions.invoke('generateHajjUmrahGuidance', {
        guidance_type: 'complete_itinerary',
        pilgrimage_type: pilgrimageType,
        travel_dates: { departure_date: departureDate, return_date: returnDate },
        user_preferences: {}
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hajj-itinerary']);
      toast.success('Personalized itinerary generated!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate itinerary');
    }
  });

  const { data: itinerary } = useQuery({
    queryKey: ['hajj-itinerary', pilgrimageType, departureDate, returnDate],
    enabled: false
  });

  // Load ritual explanation
  const { data: ritualGuide, isLoading: loadingRitual, refetch: fetchRitual } = useQuery({
    queryKey: ['ritual-guide', selectedRitual, pilgrimageType],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateHajjUmrahGuidance', {
        guidance_type: 'ritual_explanation',
        pilgrimage_type: pilgrimageType,
        user_preferences: { ritual_name: selectedRitual }
      });
      return response.data;
    },
    enabled: false
  });

  // Load packing list
  const { data: packingList, isLoading: loadingPacking, refetch: fetchPacking } = useQuery({
    queryKey: ['packing-list', pilgrimageType],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateHajjUmrahGuidance', {
        guidance_type: 'packing_list',
        pilgrimage_type: pilgrimageType
      });
      return response.data;
    },
    enabled: false
  });

  // Load duas compilation
  const { data: duasGuide, isLoading: loadingDuas, refetch: fetchDuas } = useQuery({
    queryKey: ['duas-guide', selectedStage, pilgrimageType],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateHajjUmrahGuidance', {
        guidance_type: 'duas_compilation',
        pilgrimage_type: pilgrimageType,
        user_preferences: { stage: selectedStage }
      });
      return response.data;
    },
    enabled: false
  });

  // Load navigation guide
  const { data: navGuide, isLoading: loadingNav, refetch: fetchNavigation } = useQuery({
    queryKey: ['navigation-guide', navigationFrom, navigationTo],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateHajjUmrahGuidance', {
        guidance_type: 'navigation_guide',
        pilgrimage_type: pilgrimageType,
        user_preferences: { from: navigationFrom, to: navigationTo }
      });
      return response.data;
    },
    enabled: false
  });

  const rituals = [
    'Tawaf', 'Sa\'i', 'Ihram', 'Wuquf at Arafah', 'Muzdalifah', 
    'Rami (Stoning)', 'Halq/Taqsir', 'Tawaf al-Ifadah'
  ];

  const stages = [
    { value: 'entering_makkah', label: 'Entering Makkah' },
    { value: 'at_kaaba', label: 'At the Kaaba' },
    { value: 'during_tawaf', label: 'During Tawaf' },
    { value: 'during_sai', label: 'During Sa\'i' },
    { value: 'at_arafah', label: 'At Arafah' },
    { value: 'at_mina', label: 'At Mina' },
    { value: 'general_duas', label: 'General Duas' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-teal-600" />
            Enhanced Hajj & Umrah AI Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pilgrimage Type</Label>
              <Select value={pilgrimageType} onValueChange={setPilgrimageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umrah">Umrah</SelectItem>
                  <SelectItem value="Hajj">Hajj</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departure Date</Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Return Date</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => generateItinerary.mutate()}
            disabled={generateItinerary.isPending || !departureDate || !returnDate}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {generateItinerary.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Personalized Itinerary...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI-Powered Itinerary
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="itinerary">
            <Calendar className="w-4 h-4 mr-2" />
            Itinerary
          </TabsTrigger>
          <TabsTrigger value="rituals">
            <BookOpen className="w-4 h-4 mr-2" />
            Rituals
          </TabsTrigger>
          <TabsTrigger value="packing">
            <Package className="w-4 h-4 mr-2" />
            Packing
          </TabsTrigger>
          <TabsTrigger value="duas">
            <Heart className="w-4 h-4 mr-2" />
            Duas
          </TabsTrigger>
          <TabsTrigger value="navigation">
            <Navigation className="w-4 h-4 mr-2" />
            Navigate
          </TabsTrigger>
        </TabsList>

        {/* Itinerary Tab */}
        <TabsContent value="itinerary" className="space-y-4">
          {itinerary?.success && itinerary.guidance ? (
            <div className="space-y-6">
              {/* Pre-departure */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pre-Departure Preparation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {itinerary.guidance.pre_departure?.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-amber-900">{item.task}</span>
                            <Badge className={
                              item.importance === 'critical' ? 'bg-red-100 text-red-800' :
                              item.importance === 'important' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {item.importance}
                            </Badge>
                          </div>
                          <p className="text-sm text-amber-800">{item.details}</p>
                          <p className="text-xs text-amber-600 mt-1">{item.timeline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Daily Itinerary */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">Daily Schedule</h3>
                {itinerary.guidance.daily_itinerary?.map((day, idx) => (
                  <Card key={idx} className="border-teal-200">
                    <CardHeader 
                      className="cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Day {day.day}: {day.title}</CardTitle>
                          <p className="text-sm text-slate-600 mt-1">
                            {day.date} • {day.location}
                          </p>
                        </div>
                        {expandedDay === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedDay === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4">
                            {/* Spiritual Focus */}
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-sm font-semibold text-purple-900 mb-1">Spiritual Focus</p>
                              <p className="text-sm text-purple-800">{day.spiritual_focus}</p>
                            </div>

                            {/* Activities */}
                            <div className="space-y-3">
                              {day.activities?.map((activity, actIdx) => (
                                <div key={actIdx} className="p-3 bg-white rounded-lg border border-slate-200">
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-4 h-4 text-teal-600 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-semibold text-slate-800 mb-1">
                                        {activity.time} - {activity.activity}
                                      </div>
                                      {activity.ritual_name && (
                                        <Badge className="mb-2 bg-teal-100 text-teal-800">
                                          {activity.ritual_name}
                                        </Badge>
                                      )}
                                      <p className="text-sm text-slate-700 mb-2">{activity.description}</p>
                                      
                                      {activity.duas?.length > 0 && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-emerald-900 mb-1">Essential Duas:</p>
                                          {activity.duas.map((dua, duaIdx) => (
                                            <p key={duaIdx} className="text-xs text-emerald-800 italic">• {dua}</p>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {activity.tips?.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-blue-900 mb-1">Tips:</p>
                                          {activity.tips.map((tip, tipIdx) => (
                                            <p key={tipIdx} className="text-xs text-blue-800">• {tip}</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Generate Your Personalized Itinerary
              </h3>
              <p className="text-slate-500">
                Select your travel dates and generate an AI-powered day-by-day plan
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Rituals Tab */}
        <TabsContent value="rituals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learn About Rituals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedRitual} onValueChange={setSelectedRitual}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rituals.map(ritual => (
                    <SelectItem key={ritual} value={ritual}>{ritual}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => fetchRitual()}
                disabled={loadingRitual}
                className="w-full"
              >
                {loadingRitual ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                ) : (
                  <><BookOpen className="w-4 h-4 mr-2" /> Learn About {selectedRitual}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {ritualGuide?.success && (
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle>{ritualGuide.guidance.ritual_name}</CardTitle>
                <p className="text-sm text-slate-600">{ritualGuide.guidance.brief_description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Spiritual Significance</h4>
                  <p className="text-sm text-purple-800">{ritualGuide.guidance.spiritual_significance}</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Historical Context</h4>
                  <p className="text-sm text-blue-800">{ritualGuide.guidance.historical_context}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Step-by-Step Guide</h4>
                  <div className="space-y-3">
                    {ritualGuide.guidance.step_by_step_guide?.map((step, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-teal-700">{step.step_number}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800 mb-1">{step.action}</p>
                            <p className="text-sm text-slate-600 mb-2">{step.details}</p>
                            {step.duas?.length > 0 && (
                              <div className="text-xs text-emerald-700 italic mb-1">
                                {step.duas.map((dua, duaIdx) => (
                                  <p key={duaIdx}>🤲 {dua}</p>
                                ))}
                              </div>
                            )}
                            {step.tips && (
                              <p className="text-xs text-blue-700">💡 {step.tips}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {ritualGuide.guidance.common_mistakes?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Common Mistakes to Avoid</h4>
                    <ul className="space-y-1">
                      {ritualGuide.guidance.common_mistakes.map((mistake, idx) => (
                        <li key={idx} className="text-sm text-red-800">⚠️ {mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Packing Tab */}
        <TabsContent value="packing" className="space-y-4">
          <Button
            onClick={() => fetchPacking()}
            disabled={loadingPacking}
            className="w-full"
          >
            {loadingPacking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
            ) : (
              <><Package className="w-4 h-4 mr-2" /> Generate Packing List</>
            )}
          </Button>

          {packingList?.success && (
            <div className="space-y-4">
              {packingList.guidance.categories?.map((category, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base">{category.category_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.items?.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{item.item}</span>
                              <span className="text-xs text-slate-500">({item.quantity})</span>
                              <Badge className={
                                item.priority === 'essential' ? 'bg-red-100 text-red-800' :
                                item.priority === 'important' ? 'bg-amber-100 text-amber-800' :
                                'bg-blue-100 text-blue-800'
                              }>
                                {item.priority}
                              </Badge>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-slate-600 mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Duas Tab */}
        <TabsContent value="duas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Essential Duas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => fetchDuas()}
                disabled={loadingDuas}
                className="w-full"
              >
                {loadingDuas ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                ) : (
                  <><Heart className="w-4 h-4 mr-2" /> Load Duas for This Stage</>
                )}
              </Button>
            </CardContent>
          </Card>

          {duasGuide?.success && (
            <div className="space-y-3">
              {duasGuide.guidance.duas?.map((dua, idx) => (
                <Card key={idx} className="border-emerald-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-emerald-900 mb-2">{dua.title}</h4>
                    <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white mb-3">
                      <p className="text-xl font-arabic leading-loose mb-2" dir="rtl">{dua.arabic}</p>
                      <p className="text-sm italic mb-2">{dua.transliteration}</p>
                      <p className="text-sm">{dua.translation}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold text-slate-700">When:</span> {dua.occasion}</p>
                      <p><span className="font-semibold text-slate-700">Benefit:</span> {dua.benefit}</p>
                      <p className="text-xs text-slate-500">Source: {dua.source}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Get Directions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  placeholder="e.g., My hotel, Clock Tower"
                  value={navigationFrom}
                  onChange={(e) => setNavigationFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  placeholder="e.g., Masjid al-Haram, Jabal al-Nour"
                  value={navigationTo}
                  onChange={(e) => setNavigationTo(e.target.value)}
                />
              </div>
              
              <Button
                onClick={() => fetchNavigation()}
                disabled={loadingNav || !navigationFrom || !navigationTo}
                className="w-full"
              >
                {loadingNav ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                ) : (
                  <><Navigation className="w-4 h-4 mr-2" /> Get Directions</>
                )}
              </Button>
            </CardContent>
          </Card>

          {navGuide?.success && (
            <div className="space-y-4">
              {navGuide.guidance.routes?.map((route, idx) => (
                <Card key={idx} className="border-blue-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{route.route_name}</CardTitle>
                      <Badge className={
                        route.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        route.difficulty === 'moderate' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {route.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {route.distance} • {route.walking_time}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h5 className="font-semibold text-slate-800 mb-2">Directions</h5>
                      <ol className="space-y-2">
                        {route.directions?.map((direction, dirIdx) => (
                          <li key={dirIdx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="font-semibold text-teal-600">{dirIdx + 1}.</span>
                            <span>{direction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {route.landmarks?.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-semibold text-blue-900 mb-2">Key Landmarks</h5>
                        <div className="flex flex-wrap gap-2">
                          {route.landmarks.map((landmark, lmIdx) => (
                            <Badge key={lmIdx} variant="outline" className="text-blue-700">
                              <MapPin className="w-3 h-3 mr-1" />
                              {landmark}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {navGuide.guidance.safety_tips?.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-base text-amber-900">Safety Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {navGuide.guidance.safety_tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-amber-800">⚠️ {tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}