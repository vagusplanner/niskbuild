import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Brain, TrendingUp, Target, CheckCircle2,
  Calendar, Zap, Heart, Moon, Activity, Loader2,
  ArrowRight, Clock, Award, AlertCircle, Volume2, VolumeX, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import HealthGoalManager from './HealthGoalManager';
import WellnessCalendarIntegration from './WellnessCalendarIntegration';
import { useAIScheduling } from '@/components/assistant/AISchedulingBridge';

export default function AIHealthCoach() {
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeaking, setCurrentlySpeaking] = useState(null);
  const { createEvent, createTask } = useAIScheduling();

  const { data: analysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['healthCoachAnalysis'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('aiHealthCoach', {
        mode: 'analysis'
      });
      return data.analysis;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const generateAnalysis = async () => {
    setAnalyzing(true);
    try {
      await refetchAnalysis();
      toast.success('Health analysis updated!');
    } catch (error) {
      toast.error('Failed to generate analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const speakText = (text, id) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      if (currentlySpeaking === id) {
        setIsSpeaking(false);
        setCurrentlySpeaking(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentlySpeaking(id);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentlySpeaking(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech not supported in your browser');
    }
  };

  if (!analysis && !analyzing) {
    return (
      <Card className="border-2 border-dashed border-purple-200">
        <CardContent className="py-12 text-center">
          <Brain className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">AI Health Coach</h3>
          <p className="text-sm text-slate-600 mb-4">
            Get personalized wellness insights based on your health data
          </p>
          <Button onClick={generateAnalysis} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Health Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (analyzing) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Analyzing your health data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wellness Score */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Wellness Score</h3>
              <p className="text-sm text-slate-600">Based on your recent health data</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-purple-700">{analysis?.wellness_score}</div>
              <p className="text-xs text-slate-500">out of 100</p>
            </div>
          </div>
          <Progress value={analysis?.wellness_score} className="h-3" />
          <p className="text-sm text-slate-700 mt-3">{analysis?.summary}</p>
          <Button
            onClick={generateAnalysis}
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={analyzing}
          >
            {analyzing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
            Refresh Analysis
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="goals">My Goals</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
          <TabsTrigger value="nudges">Quick Wins</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <HealthGoalManager />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Your Strengths
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => speakText(analysis?.strengths?.join('. '), 'strengths')}
                  className="h-8 w-8"
                >
                  {currentlySpeaking === 'strengths' ? (
                    <VolumeX className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-600" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis?.strengths?.map((strength, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    {strength}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Improvement Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-orange-600" />
                Areas for Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis?.improvement_areas?.map((area, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="border-l-4 border-orange-400 pl-4 py-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-orange-100 text-orange-700">{area.area}</Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{area.current_status}</p>
                    <p className="text-xs text-slate-600 mb-2">💡 {area.why_important}</p>
                    <p className="text-xs font-semibold text-orange-700">Target: {area.target}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Plan Tab */}
        <TabsContent value="plan" className="space-y-4">
          <WellnessCalendarIntegration weeklyPlan={analysis?.weekly_plan} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Your 7-Day Wellness Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis?.weekly_plan?.map((day) => (
                  <Card key={day.day} className="bg-slate-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-blue-100 text-blue-700">Day {day.day}</Badge>
                        <span className="font-semibold text-slate-800">{day.focus}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-700">Morning</p>
                            <p className="text-slate-600">{day.morning}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Activity className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-700">Afternoon</p>
                            <p className="text-slate-600">{day.afternoon}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Moon className="w-4 h-4 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-700">Evening</p>
                            <p className="text-slate-600">{day.evening}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between">
                          <p className="text-xs font-semibold text-blue-700">
                            🎯 Daily Goal: {day.goal}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const dateStr = format(new Date(Date.now() + (day.day - 1) * 86400000), 'yyyy-MM-dd');
                              await createTask({
                                title: `Wellness Goal: ${day.goal}`,
                                description: `Focus: ${day.focus}\nMorning: ${day.morning}\nAfternoon: ${day.afternoon}\nEvening: ${day.evening}`,
                                category: 'health',
                                priority: 'high',
                                due_date: dateStr
                              });
                            }}
                            className="text-xs h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add as Task
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Immediate Nudges Tab */}
        <TabsContent value="nudges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Quick Wins - Start Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis?.immediate_nudges?.map((nudge, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 hover:border-yellow-300 transition-all">
                     <CardContent className="pt-4">
                       <div className="flex items-start justify-between mb-2">
                         <h4 className="font-semibold text-slate-800">{nudge.title}</h4>
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-xs">
                             <Clock className="w-3 h-3 mr-1" />
                             {nudge.time}
                           </Badge>
                           <Button
                             size="icon"
                             variant="ghost"
                             onClick={() => speakText(`${nudge.title}. ${nudge.action}. ${nudge.why}`, `nudge-${idx}`)}
                             className="h-7 w-7"
                           >
                             {currentlySpeaking === `nudge-${idx}` ? (
                               <VolumeX className="w-3 h-3 text-purple-600" />
                             ) : (
                               <Volume2 className="w-3 h-3 text-slate-600" />
                             )}
                           </Button>
                         </div>
                       </div>
                       <p className="text-sm text-slate-700 mb-2">{nudge.action}</p>
                       <p className="text-xs text-slate-600 flex items-center gap-1 mb-3">
                         <Heart className="w-3 h-3 text-red-500" />
                         {nudge.why}
                       </p>
                       <div className="flex gap-2 pt-2 border-t border-yellow-200">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             const timeMap = { morning: '08:00', afternoon: '14:00', evening: '20:00' };
                             const defaultTime = timeMap[nudge.time?.toLowerCase()] || '12:00';
                             await createEvent({
                               title: nudge.title,
                               description: `${nudge.action}\n\nWhy: ${nudge.why}`,
                               start_date: `${format(new Date(), 'yyyy-MM-dd')}T${defaultTime}:00`,
                               end_date: `${format(new Date(), 'yyyy-MM-dd')}T${defaultTime.split(':')[0]}:30:00`,
                               category: 'health'
                             });
                           }}
                           className="flex-1"
                         >
                           <Calendar className="w-3 h-3 mr-1" />
                           Schedule
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             await createTask({
                               title: nudge.title,
                               description: `${nudge.action}\n\nWhy: ${nudge.why}`,
                               category: 'health',
                               priority: 'high',
                               due_date: format(new Date(), 'yyyy-MM-dd')
                             });
                           }}
                           className="flex-1"
                         >
                           <CheckCircle2 className="w-3 h-3 mr-1" />
                           Add Task
                         </Button>
                       </div>
                     </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Patterns We've Noticed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis?.patterns?.map((pattern, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg"
                  >
                    <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                    <p className="text-sm text-slate-700 flex-1">{pattern}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}