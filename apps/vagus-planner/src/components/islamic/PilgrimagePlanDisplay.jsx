import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Download, Save, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PilgrimagePlanDisplay({ plan, onGetFeedback, onSave, isFeedbackLoading }) {
  const [feedback, setFeedback] = useState(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleRequestFeedback = () => {
    onGetFeedback({
      plan,
      user_feedback: userFeedback,
      modifications: []
    }, (result) => {
      setFeedback(result);
      setShowFeedbackForm(false);
    });
  };

  const handleSave = () => {
    onSave(plan);
  };

  const handleShare = async () => {
    const shareText = `Check out my personalized ${plan.title} plan! Budget: $${plan.budget_breakdown?.total}, Duration: ${plan.daily_schedule?.length} days`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.title,
          text: shareText
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Plan details copied to clipboard');
    }
  };

  const handleDownloadPDF = () => {
    const content = JSON.stringify(plan, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${plan.title}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Plan downloaded');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">{plan.title}</h2>
              <p className="text-sm text-emerald-800">{plan.summary}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge className="bg-emerald-600">{plan.daily_schedule?.length} Days</Badge>
                <Badge className="bg-teal-600">${plan.budget_breakdown?.total?.toLocaleString()}</Badge>
                <Badge className="bg-blue-600">Personalization: {plan.personalization_score}</Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSave} size="sm" variant="outline" className="border-emerald-300">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleShare} size="sm" variant="outline" className="border-emerald-300">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="border-emerald-300">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Plan</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="wellness">Wellness</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Accommodation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏨 Accommodation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.accommodation_recommendations?.map((acc, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 rounded">
                    <p className="font-semibold text-sm text-slate-900">{acc.location}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {acc.duration_nights} nights • ${acc.budget_per_night}/night
                    </p>
                    <p className="text-xs text-slate-700 mt-1">{acc.proximity_to_key_sites}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💰 Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(plan.budget_breakdown || {}).map(([category, amount]) => (
                    category !== 'total' && (
                      <div key={category} className="flex justify-between">
                        <span className="text-slate-600 capitalize">{category.replace('_', ' ')}:</span>
                        <span className="font-semibold text-slate-900">${amount.toLocaleString()}</span>
                      </div>
                    )
                  ))}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg text-emerald-600">${plan.budget_breakdown?.total?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Crowd Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">👥 Crowd Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Peak Times to Avoid:</p>
                  <ul className="space-y-1">
                    {plan.crowd_management_strategy?.peak_times?.map((time, idx) => (
                      <li key={idx} className="text-slate-700">⏰ {time}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Optimal Visiting Times:</p>
                  <ul className="space-y-1">
                    {plan.crowd_management_strategy?.optimal_visiting_times?.map((time, idx) => (
                      <li key={idx} className="text-emerald-700">✓ {time}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Spiritual Focus */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🤲 Spiritual Enhancement</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="text-slate-700">
                  <strong>Reflection Times:</strong> {plan.spiritual_enhancement?.reflection_times?.join(', ')}
                </p>
                <p className="text-slate-700">
                  <strong>Recommended Duas:</strong> {plan.spiritual_enhancement?.recommended_duas?.slice(0, 3).join(', ')}...
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cultural Etiquette */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-base">🌏 Cultural Etiquette</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {plan.cultural_etiquette?.map((tip, idx) => (
                  <li key={idx} className="text-amber-900">✓ {tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Plan Tab */}
        <TabsContent value="daily" className="space-y-3">
          {plan.daily_schedule?.slice(0, 5).map((day, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Day {day.day} - {day.theme}</span>
                  <Badge>{day.physical_demand}</Badge>
                </CardTitle>
                <p className="text-xs text-slate-600 mt-1">{day.date}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {['morning', 'afternoon', 'evening'].map(period => (
                  day[period]?.activity && (
                    <div key={period} className="p-2 bg-slate-50 rounded">
                      <p className="text-xs font-semibold text-slate-900 capitalize mb-1">
                        {period}: {day[period].time}
                      </p>
                      <p className="text-xs text-slate-700">{day[period].activity}</p>
                      <p className="text-xs text-blue-600 mt-1">📍 {day[period].location}</p>
                      {day[period].crowd_level_estimate && (
                        <p className="text-xs text-slate-600 mt-1">
                          Crowd: {day[period].crowd_level_estimate} • Best time: {day[period].best_time_to_visit}
                        </p>
                      )}
                    </div>
                  )
                ))}
              </CardContent>
            </Card>
          ))}
          {plan.daily_schedule?.length > 5 && (
            <p className="text-center text-xs text-slate-600">+{plan.daily_schedule.length - 5} more days in full plan</p>
          )}
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {plan.alternatives && (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 mb-2">Budget Scenarios</p>
                    {plan.alternatives?.if_budget_increases && (
                      <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-xs">
                        <p className="font-semibold text-emerald-900 mb-1">💰 If Budget Increases:</p>
                        <p className="text-emerald-800">{plan.alternatives.if_budget_increases}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wellness Tab */}
        <TabsContent value="wellness">
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900 mb-2">💧 Daily Hydration</p>
                <p className="text-slate-700">{plan.health_wellness?.daily_water_intake_liters} liters per day</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-2">😴 Rest Schedule</p>
                <p className="text-slate-700">{plan.health_wellness?.rest_schedule}</p>
              </div>
              {plan.health_wellness?.physical_preparation?.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-900 mb-2">🏃 Physical Preparation</p>
                  <ul className="space-y-1">
                    {plan.health_wellness.physical_preparation.map((exercise, idx) => (
                      <li key={idx} className="text-slate-700">✓ {exercise}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          {!feedback ? (
            <Card>
              <CardContent className="pt-6">
                {!showFeedbackForm ? (
                  <Button
                    onClick={() => setShowFeedbackForm(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Get AI Feedback on This Plan
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="Any specific concerns or modifications you'd like feedback on?"
                      className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-24"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRequestFeedback}
                        disabled={isFeedbackLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isFeedbackLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Analyzing...
                          </>
                        ) : (
                          '✨ Get Feedback'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowFeedbackForm(false);
                          setUserFeedback('');
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Overall Assessment */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base">📊 Overall Assessment</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Rating:</strong> {feedback.overall_assessment?.rating}</p>
                  <div>
                    <p className="font-semibold text-blue-900">Key Strengths:</p>
                    <ul className="mt-1 space-y-1">
                      {feedback.overall_assessment?.key_strengths?.map((strength, idx) => (
                        <li key={idx} className="text-blue-800">✓ {strength}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Top Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🎯 Top Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {feedback.implementation_priority?.slice(0, 3).map((rec, idx) => (
                    <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded">
                      <p className="font-semibold text-amber-900">Priority {rec.priority}: {rec.action}</p>
                      <p className="text-amber-800 text-xs mt-1">Impact: {rec.impact}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}