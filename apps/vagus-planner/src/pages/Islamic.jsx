import React, { useState, lazy, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Moon, BookOpen, Heart, Star, Trash2, Target, Plane, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import UnifiedIslamicAIPanel from '@/components/assistant/UnifiedIslamicAIPanel';
import AIBusinessInsights from '@/components/analytics/AIBusinessInsights';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul-Qa'dah", 'Dhul-Hijjah'
];

// Lazy load heavy components
const EnhancedQuranReader = lazy(() => import('@/components/islamic/EnhancedQuranReader'));
const EnhancedHadithReader = lazy(() => import('@/components/islamic/EnhancedHadithReader'));

// Eager load overview components only
import HijriCalendar from '@/components/islamic/HijriCalendar';
import DailyVerse from '@/components/islamic/DailyVerse';
import AIHadithGenerator from '@/components/islamic/AIHadithGenerator';
import AIContextualDuaSuggester from '@/components/islamic/AIContextualDuaSuggester';
import IslamicEventCreator from '@/components/islamic/IslamicEventCreator';
import IslamicDateContextViewer from '@/components/islamic/IslamicDateContextViewer';
import PrayerTimes from '@/components/calendar/PrayerTimes';
import HadithOfDay from '@/components/islamic/HadithOfDay';
import DailyDuaCard from '@/components/islamic/DailyDuaCard';
import QuranGoalTracker from '@/components/islamic/QuranGoalTracker';
import FastingTracker from '@/components/islamic/FastingTracker';
import PersonalizedReflectionCard from '@/components/islamic/PersonalizedReflectionCard';
import EnhancedDuaCard from '@/components/islamic/EnhancedDuaCard';
import EnhancedHajjUmrahPlanner from '@/components/islamic/EnhancedHajjUmrahPlanner';
import PersonalizedIslamicAI from '@/components/islamic/PersonalizedIslamicAI';
import ZakatCalculator from '@/components/islamic/ZakatCalculator';
import SadaqahTracker from '@/components/islamic/SadaqahTracker';
import AIZakatRecommendations from '@/components/islamic/AIZakatRecommendations';
import AISadaqahTracker from '@/components/islamic/AISadaqahTracker';
import CharityFinancialReport from '@/components/islamic/CharityFinancialReport';
import MultiYearZakatTracker from '@/components/islamic/MultiYearZakatTracker';
import SpecificZakatCalculators from '@/components/islamic/SpecificZakatCalculators';
import CharityDirectory from '@/components/islamic/CharityDirectory';
import DonationImpactTracker from '@/components/islamic/DonationImpactTracker';
import OfflineQuranViewer from '@/components/offline/OfflineQuranViewer';
import MuslimTravelAssistant from '@/components/islamic/MuslimTravelAssistant';

// Import QiblaFinder for overview (eager load)
import QiblaFinder from '@/components/islamic/QiblaFinder';
import DigitalTasbih from '@/components/islamic/DigitalTasbih';
import IslamicEventsNotificationPanel from '@/components/islamic/IslamicEventsNotificationPanel';
import EnhancedHijriCalendarView from '@/components/islamic/EnhancedHijriCalendarView';
import PrayerReminderWidget from '@/components/islamic/PrayerReminderWidget';
import IslamicDailyRoutineManager from '@/components/islamic/IslamicDailyRoutineManager';
import DhikrGoalTracker from '@/components/islamic/DhikrGoalTracker';
import SmartDuaReminders from '@/components/islamic/SmartDuaReminders';
import AIPrayerCoach from '@/components/islamic/AIPrayerCoach';
import SunnahPrayerScheduler from '@/components/islamic/SunnahPrayerScheduler';
import PrayerMindfulnessGuide from '@/components/islamic/PrayerMindfulnessGuide';

// Lazy load other tab components
const AdvancedPrayerTimes = lazy(() => import('@/components/islamic/AdvancedPrayerTimes'));
const PrayerTracker = lazy(() => import('@/components/islamic/PrayerTracker'));
const PrayerAnalytics = lazy(() => import('@/components/islamic/PrayerAnalytics'));
const PrayerReminderCustomizer = lazy(() => import('@/components/islamic/PrayerReminderCustomizer'));
const AIPrayerInsights = lazy(() => import('@/components/islamic/AIPrayerInsights'));
const AdvancedPrayerTracker = lazy(() => import('@/components/islamic/AdvancedPrayerTracker'));
const PrayerAnalyticsDashboard = lazy(() => import('@/components/islamic/PrayerAnalyticsDashboard'));
const AdvancedPrayerAnalytics = lazy(() => import('@/components/islamic/AdvancedPrayerAnalytics'));
const PrayerAIInsights = lazy(() => import('@/components/islamic/PrayerAIInsights'));
const QuranReadingChallenge = lazy(() => import('@/components/islamic/QuranReadingChallenge'));
const QuranMemorizationTracker = lazy(() => import('@/components/islamic/QuranMemorizationTracker'));
const PersonalizedReadingPlan = lazy(() => import('@/components/islamic/PersonalizedReadingPlan'));
const IslamicLearning = lazy(() => import('@/components/islamic/IslamicLearning'));
const IslamicProfile = lazy(() => import('@/components/islamic/IslamicProfile'));
const RamadanDashboard = lazy(() => import('@/components/ramadan/RamadanDashboard'));

export default function IslamicPage() {
  const [showEnhancedReader, setShowEnhancedReader] = useState(false);
  const [showHadithReader, setShowHadithReader] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventContext, setShowEventContext] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const { data: favoriteVerses = [], isLoading } = useQuery({
    queryKey: ['favoriteVerses'],
    queryFn: () => base44.entities.QuranVerse.filter({ is_favorite: true }, '-created_date'),
    enabled: activeTab === 'favorites'
  });

  const { data: events = [] } = useQuery({
    queryKey: ['islamic-events'],
    queryFn: () => base44.entities.IslamicEvent.list('-hijri_month', 100)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuranVerse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteVerses'] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.QuranVerse.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteVerses'] });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg">
              <Moon className="w-8 h-8 text-white" fill="white" />
            </div>
            Islamic Features
          </h1>
          <p className="text-slate-500 mt-2">
            Prayer times, Hijri calendar, and daily Quran verses
          </p>
        </motion.div>

        {/* Unified Islamic AI Assistant */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <UnifiedIslamicAIPanel />
        </motion.div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm border flex-wrap h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="routine" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Daily Routine
            </TabsTrigger>
            <TabsTrigger value="prayers" className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Prayers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="quran" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Quran
            </TabsTrigger>
            <TabsTrigger value="tasbih" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Tasbih
            </TabsTrigger>
            <TabsTrigger value="hajj" className="flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Hajj/Umrah
            </TabsTrigger>
            <TabsTrigger value="travel" className="flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Muslim Travel
            </TabsTrigger>
            <TabsTrigger value="ramadan" className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Ramadan
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Prayer Tab */}
          <TabsContent value="prayers" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AdvancedPrayerTimes settings={settings?.[0]} />
                </div>
                <QiblaFinder />
              </div>

              {/* Advanced Prayer Tracker */}
              <Card>
                <CardHeader>
                  <CardTitle>Prayer Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <AdvancedPrayerTracker />
                </CardContent>
              </Card>

              {/* Sunnah Prayer Scheduler */}
              <SunnahPrayerScheduler />

              {/* Prayer Mindfulness Guide */}
              <PrayerMindfulnessGuide />

              <Card>
                <CardHeader>
                  <CardTitle>Reminder Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrayerReminderCustomizer />
                </CardContent>
              </Card>
            </Suspense>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdvancedPrayerAnalytics />
            </Suspense>
          </TabsContent>

          {/* Overview Tab */}
          {/* Daily Routine Tab */}
          <TabsContent value="routine" className="space-y-6">
            <IslamicDailyRoutineManager />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DhikrGoalTracker />
              <SmartDuaReminders />
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowEnhancedReader(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-6"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Read Quran
              </Button>
              <Button
                onClick={() => setShowHadithReader(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-6"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Hadiths
              </Button>
            </div>

            {/* Enhanced Calendar & Event Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedHijriCalendarView />
              <IslamicEventsNotificationPanel />
            </div>

            {/* Prayer Times, Reminders & Qibla */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <PrayerTimes settings={settings?.[0]} />
              <PrayerReminderWidget />
              <QiblaFinder />
            </div>

            {/* Tasbih */}
            <DigitalTasbih compact />



            {/* Daily Inspiration */}
            <DailyVerse compact={false} />

            {/* Daily Inspiration with Quick Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Inspiration</CardTitle>
                  <div className="flex gap-2">
                    <IslamicEventCreator onEventCreated={() => {
                      queryClient.invalidateQueries(['islamic-events']);
                    }} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PersonalizedReflectionCard />
                  <EnhancedDuaCard />
                </div>
              </CardContent>
            </Card>

            {/* Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Spiritual Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Quran Goals</h3>
                    <QuranGoalTracker />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Fasting Tracker</h3>
                    <FastingTracker />
                    <p className="text-xs text-slate-500 mt-3">
                      💡 Visit the Calendar page for AI-powered fasting suggestions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Zakat & Sadaqah */}
             <div className="grid gap-6">
               <MultiYearZakatTracker />
               
               <div className="grid lg:grid-cols-2 gap-6">
                 <ZakatCalculator />
                 <SadaqahTracker />
               </div>
               
               <SpecificZakatCalculators />
               
               <CharityDirectory />

               <DonationImpactTracker />

               <CharityFinancialReport />
             </div>

          </TabsContent>

          {/* Quran Tab */}
          <TabsContent value="quran" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <div className="grid gap-4">
                <Button
                  onClick={() => setShowEnhancedReader(true)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-6"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Open Quran Reader
                </Button>
                <Button
                  onClick={() => setShowHadithReader(true)}
                  size="lg"
                  variant="outline"
                  className="w-full py-6 border-2 border-amber-500 text-amber-700 hover:bg-amber-50"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Explore Hadiths
                </Button>
              </div>

              {/* Offline Quran Access */}
              <OfflineQuranViewer />

              <Card>
                <CardHeader>
                  <CardTitle>Reading Goals & Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Reading Challenge</h3>
                    <QuranReadingChallenge />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Reading Plan</h3>
                    <PersonalizedReadingPlan />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memorization</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuranMemorizationTracker />
                </CardContent>
              </Card>
            </Suspense>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : favoriteVerses.length > 0 ? (
              <div className="grid gap-4">
                {favoriteVerses.map((verse, index) => (
                  <motion.div
                    key={verse.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-emerald-200 overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-emerald-600" />
                            <span className="font-semibold text-emerald-900">
                              {verse.surah_name} {verse.verse_number}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavoriteMutation.mutate({ 
                                id: verse.id, 
                                isFavorite: verse.is_favorite 
                              })}
                              className="h-8 w-8"
                            >
                              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Remove this verse from favorites?')) {
                                  deleteMutation.mutate(verse.id);
                                }
                              }}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl mb-4">
                          <p className="text-right text-xl leading-loose font-arabic text-emerald-900" dir="rtl">
                            {verse.arabic_text}
                          </p>
                        </div>

                        {verse.transliteration && (
                          <div className="mb-3 p-3 bg-white/40 rounded-lg">
                            <p className="text-sm text-slate-600 italic">
                              {verse.transliteration}
                            </p>
                          </div>
                        )}

                        <p className="text-slate-700 leading-relaxed mb-3">
                          {verse.translation}
                        </p>

                        {verse.notes && (
                          <div className="pt-3 border-t border-emerald-200">
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Notes: </span>
                              {verse.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center bg-white/50 border-dashed border-2">
                <Heart className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No favorite verses yet
                </h3>
                <p className="text-slate-500">
                  Click the heart icon on verses to save them here
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Hajj/Umrah Tab */}
          <TabsContent value="hajj" className="space-y-6">
            <EnhancedHajjUmrahPlanner />
          </TabsContent>

          {/* Muslim Travel Tab */}
          <TabsContent value="travel" className="space-y-6 h-screen">
            <MuslimTravelAssistant />
          </TabsContent>

          {/* Ramadan Tab */}
          <TabsContent value="ramadan" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <RamadanDashboard />
            </Suspense>
          </TabsContent>

          {/* Tasbih Tab */}
          <TabsContent value="tasbih" className="space-y-6">
            <DigitalTasbih />
          </TabsContent>

          {/* Learning Tab */}
          <TabsContent value="learning" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <Card>
                <CardHeader>
                  <CardTitle>Islamic Learning & Knowledge</CardTitle>
                </CardHeader>
                <CardContent>
                  <IslamicLearning />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Islamic Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <IslamicProfile />
                </CardContent>
              </Card>
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Enhanced Reader Modal */}
        {showEnhancedReader && (
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Skeleton className="h-96 w-96" /></div>}>
            <EnhancedQuranReader
              onClose={() => setShowEnhancedReader(false)}
            />
          </Suspense>
        )}

        {/* Enhanced Hadith Reader Modal */}
         {showHadithReader && (
           <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Skeleton className="h-96 w-96" /></div>}>
             <EnhancedHadithReader
               onClose={() => setShowHadithReader(false)}
             />
           </Suspense>
         )}

         {/* Islamic Date Context Viewer */}
         <IslamicDateContextViewer 
           event={selectedEvent} 
           isOpen={showEventContext} 
           onClose={() => {
             setShowEventContext(false);
             setSelectedEvent(null);
           }} 
         />
        </div>
        </div>
        );
        }