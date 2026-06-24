import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Plane, DollarSign, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HajjRitualTracker from './HajjRitualTracker';
import HajjAIGuide from './HajjAIGuide';
import HajjVisaChecker from './HajjVisaChecker';
import HajjFeedbackButton from './HajjFeedbackButton';
import GroupPilgrimageManager from './GroupPilgrimageManager';
import SmartPackingAssistant from './SmartPackingAssistant';
import RitualGuidanceViewer from './RitualGuidanceViewer';
import HalalPrayerFinder from './HalalPrayerFinder';
import IslamicRulingAssistant from './IslamicRulingAssistant';
import DailySummaryGenerator from './DailySummaryGenerator';
import PilgrimagePlanPreferences from './PilgrimagePlanPreferences';
import PilgrimagePlanDisplay from './PilgrimagePlanDisplay';
import PilgrimageConcierge from '../pilgrimage/PilgrimageConcierge';
import OfflineContentManager from '../pilgrimage/OfflineContentManager';
import OfflineDataViewer from '../pilgrimage/OfflineDataViewer';

export default function HajjUmrahPlanner() {
  const [pilgrimageType, setPilgrimageType] = useState('umrah');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('7');
  const [budget, setBudget] = useState('');
  const [participants, setParticipants] = useState('1');
  const [mobilityLevel, setMobilityLevel] = useState('moderate');
  const [generating, setGenerating] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [personalizedPlan, setPersonalizedPlan] = useState(null);
  const [planFeedback, setPlanFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);

  const generateItinerary = async () => {
    if (!startDate || !budget) {
      toast.error('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke('hajjUmrahAIAssistant', {
        action: 'generate_itinerary',
        pilgrimage_type: pilgrimageType,
        start_date: startDate,
        duration: parseInt(duration),
        budget: parseFloat(budget),
        participants: parseInt(participants),
        mobility_level: mobilityLevel
      });

      setItinerary(data.itinerary);

      // Create holiday in calendar
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(duration));

      await base44.entities.Holiday.create({
        title: `${pilgrimageType === 'hajj' ? 'Hajj' : 'Umrah'} Pilgrimage`,
        destination: 'Mecca, Saudi Arabia',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        budget: parseFloat(budget),
        status: 'planned',
        notes: JSON.stringify(data.itinerary),
        trip_type: pilgrimageType
      });

      toast.success('Pilgrimage itinerary generated and added to calendar!');
    } catch (error) {
      toast.error('Failed to generate itinerary');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePersonalizedPlan = async (preferences) => {
    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke('generatePersonalizedPilgrimagePlan', preferences);
      setPersonalizedPlan(data.plan);
      toast.success('Personalized plan created!');
    } catch (error) {
      toast.error('Failed to generate personalized plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleGetFeedback = async (feedbackData, callback) => {
    setFeedbackLoading(true);
    try {
      const { data } = await base44.functions.invoke('analyzePilgrimagePlanFeedback', feedbackData);
      setPlanFeedback(data.feedback);
      callback(data.feedback);
      toast.success('AI feedback generated!');
    } catch (error) {
      toast.error('Failed to generate feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSavePlan = async (plan) => {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.daily_schedule?.length);

      await base44.entities.Holiday.create({
        title: plan.title,
        destination: 'Mecca, Saudi Arabia',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        budget: plan.budget_breakdown?.total,
        status: 'planned',
        notes: JSON.stringify(plan)
      });

      setSavedPlans([...savedPlans, plan]);
      toast.success('Plan saved to calendar!');
    } catch (error) {
      toast.error('Failed to save plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Hajj & Umrah Planner</h2>
        <p className="text-emerald-50">AI-assisted planning for your sacred pilgrimage</p>
      </div>

      <Tabs defaultValue="planner" className="w-full">
        <TabsList className="grid w-full grid-cols-13 gap-1 h-auto flex-wrap">
          <TabsTrigger value="planner" className="text-xs">Trip Planner</TabsTrigger>
          <TabsTrigger value="concierge" className="text-xs">🤖 Concierge</TabsTrigger>
          <TabsTrigger value="offline-manage" className="text-xs">📱 Offline</TabsTrigger>
          <TabsTrigger value="offline-view" className="text-xs">Cached Data</TabsTrigger>
          <TabsTrigger value="personalized" className="text-xs">✨ Personalized</TabsTrigger>
          <TabsTrigger value="packing" className="text-xs">Packing</TabsTrigger>
          <TabsTrigger value="guidance" className="text-xs">Rituals</TabsTrigger>
          <TabsTrigger value="halal" className="text-xs">Halal</TabsTrigger>
          <TabsTrigger value="rulings" className="text-xs">Q&A</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
          <TabsTrigger value="group" className="text-xs">Group</TabsTrigger>
          <TabsTrigger value="rituals" className="text-xs">Tracker</TabsTrigger>
          <TabsTrigger value="visa" className="text-xs">Visa</TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Your Pilgrimage</CardTitle>
              <CardDescription>Get personalized itinerary with rituals and tourist activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pilgrimage Type</Label>
                  <Select value={pilgrimageType} onValueChange={setPilgrimageType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umrah">Umrah</SelectItem>
                      <SelectItem value="hajj">Hajj</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="3"
                    max="30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Number of Pilgrims</Label>
                  <Input
                    type="number"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Budget (USD)</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mobility Level</Label>
                  <Select value={mobilityLevel} onValueChange={setMobilityLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (Can walk long distances)</SelectItem>
                      <SelectItem value="moderate">Moderate (Some assistance needed)</SelectItem>
                      <SelectItem value="low">Low (Wheelchair/frequent rest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generateItinerary}
                disabled={generating}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Itinerary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {itinerary && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Your Personalized Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Daily Schedule */}
                {itinerary.daily_schedule?.map((day, idx) => (
                  <Card key={idx} className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg">Day {day.day}: {day.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {day.activities.map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <Badge className={
                            activity.type === 'ritual' ? 'bg-emerald-600' :
                            activity.type === 'tourist' ? 'bg-blue-600' : 'bg-amber-600'
                          }>
                            {activity.type}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{activity.title}</p>
                            <p className="text-sm text-slate-600">{activity.description}</p>
                            {activity.time && (
                              <p className="text-xs text-slate-500 mt-1">🕐 {activity.time}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {/* Budget Breakdown */}
                {itinerary.budget_breakdown && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Budget Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(itinerary.budget_breakdown).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 capitalize">{category.replace('_', ' ')}</span>
                          <span className="font-semibold">${amount}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Packing List */}
                {itinerary.packing_list && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Essential Packing List
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {itinerary.packing_list.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Feedback */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Rate This Itinerary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HajjFeedbackButton
                      feedbackType="itinerary"
                      context={{
                        pilgrimage_type: pilgrimageType,
                        destination: 'Mecca',
                        duration,
                        budget
                      }}
                      pilgrimageType={pilgrimageType}
                      showInaccuracyReport
                    />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="concierge" className="h-96">
          <PilgrimageConcierge
            currentLocation="Mecca"
            userInterests={['historical sites', 'local culture', 'food']}
          />
        </TabsContent>

        <TabsContent value="offline-manage" className="space-y-6">
          <OfflineContentManager />
        </TabsContent>

        <TabsContent value="offline-view" className="space-y-6">
          <OfflineDataViewer />
        </TabsContent>

        <TabsContent value="personalized" className="space-y-6">
          {!personalizedPlan ? (
            <PilgrimagePlanPreferences
              onGeneratePlan={handleGeneratePersonalizedPlan}
              isLoading={generating}
            />
          ) : (
            <PilgrimagePlanDisplay
              plan={personalizedPlan}
              onGetFeedback={handleGetFeedback}
              onSave={handleSavePlan}
              isFeedbackLoading={feedbackLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="packing">
           <SmartPackingAssistant 
             itinerary={itinerary}
             startDate={startDate}
             duration={duration}
             mobilityLevel={mobilityLevel}
           />
         </TabsContent>

        <TabsContent value="guidance">
          <RitualGuidanceViewer />
        </TabsContent>

        <TabsContent value="halal">
          <HalalPrayerFinder />
        </TabsContent>

        <TabsContent value="rulings">
          <IslamicRulingAssistant />
        </TabsContent>

        <TabsContent value="summary">
          <DailySummaryGenerator />
        </TabsContent>

        <TabsContent value="group">
          <GroupPilgrimageManager />
        </TabsContent>

        <TabsContent value="rituals">
          <HajjRitualTracker pilgrimageType={pilgrimageType} />
        </TabsContent>

        <TabsContent value="visa">
          <HajjVisaChecker travelDate={startDate} />
        </TabsContent>

        <TabsContent value="ai">
          <HajjAIGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}