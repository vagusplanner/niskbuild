/**
 * HajjUmrahDashboard — Unified complete Hajj & Umrah page
 * Merges all existing functionality + new complete guide:
 * - Miqat 5-point guide with du'as
 * - Umrah/Hajj step-by-step with du'as + calendar sync
 * - Packing list (men/women) with checklist
 * - Ziyarat sites (Makkah + Madinah) with du'as, history, calendar sync
 * - AI Itinerary planner (existing)
 * - Journey tracker checklist (existing)
 * - Trip prayer times & mosques (existing)
 * - Voice travel diary (new)
 * - Group chat sync link
 * - Official Nusuk links
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Moon, MapPin, Package, BookOpen, Map, Plane, Users,
  Navigation, Clock, Compass, Book, ExternalLink, Mic, Calendar
} from 'lucide-react';

// Existing components (preserved)
import TripPrayerTimesPanel from '@/components/hajj/TripPrayerTimesPanel';
import NearbyMosquesPanel from '@/components/hajj/NearbyMosquesPanel';
import RitualChecklistPanel from '@/components/hajj/RitualChecklistPanel';
import TravelDetailsForm from '@/components/hajj/TravelDetailsForm';
import PilgrimCompanion from '@/components/hajj/PilgrimCompanion';
import EnhancedHajjUmrahPlanner from '@/components/islamic/EnhancedHajjUmrahPlanner';
import HajjUmrahJourneyTracker from '@/components/islamic/HajjUmrahJourneyTracker';

// New components
import MiqatGuide from '@/components/hajj/MiqatGuide';
import RitualStepsGuide from '@/components/hajj/RitualStepsGuide';
import PackingListGuide from '@/components/hajj/PackingListGuide';
import ZiyaratGuide from '@/components/hajj/ZiyaratGuide';
import TravelDiary from '@/components/hajj/TravelDiary';

const OFFICIAL_LINKS = [
  { label: 'Nusuk — Official Hajj & Umrah Portal', url: 'https://www.nusuk.sa', desc: 'Visas, permits, packages & pilgrim registration', emoji: '🕋' },
  { label: 'Saudi eVisa', url: 'https://visa.mofa.gov.sa', desc: 'Apply for Umrah/Tourist visa online', emoji: '📋' },
  { label: 'Ministry of Hajj & Umrah', url: 'https://www.haj.gov.sa', desc: 'Official guidance, regulations & news', emoji: '🏛️' },
  { label: 'Hajj Health Requirements', url: 'https://www.moh.gov.sa/en/Hajj', desc: 'Vaccinations & health requirements (Meningitis mandatory)', emoji: '💉' },
  { label: 'General Authority of Civil Aviation', url: 'https://www.gaca.gov.sa', desc: 'Saudi flight information & airport services', emoji: '✈️' },
];

export default function HajjUmrahDashboard() {
  const [activeTab, setActiveTab] = useState('guide');

  const { data: trips = [] } = useQuery({
    queryKey: ['hajjUmrahTrips'],
    queryFn: async () => {
      const holidays = await base44.entities.Holiday.list('-start_date', 50);
      return holidays.filter(h =>
        h.destination?.toLowerCase().includes('mecca') ||
        h.destination?.toLowerCase().includes('makkah') ||
        h.destination?.toLowerCase().includes('medina') ||
        h.destination?.toLowerCase().includes('madinah') ||
        h.destination?.toLowerCase().includes('saudi')
      );
    }
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['pilgrimageGroups'],
    queryFn: () => base44.entities.PilgrimageGroup.list(),
  });

  const { data: groupChats = [] } = useQuery({
    queryKey: ['groupChats'],
    queryFn: () => base44.entities.GroupChat.list(),
  });

  const activeTrip = trips.find(t => {
    const now = new Date();
    return now >= new Date(t.start_date) && now <= new Date(t.end_date);
  }) || trips[0];

  const upcomingTrips = trips.filter(t => new Date(t.start_date) > new Date());
  const pilgrimGroup = groups[0];
  // Find a travel/hajj group chat to link diary sharing
  const travelGroupChat = groupChats.find(g =>
    g.name?.toLowerCase().includes('hajj') ||
    g.name?.toLowerCase().includes('umrah') ||
    g.name?.toLowerCase().includes('travel') ||
    g.name?.toLowerCase().includes('pilgrim')
  ) || groupChats[0];

  return (
    <div className="min-h-screen pb-safe">
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-800 p-5 shadow-xl">
            <div className="absolute top-0 right-0 text-[80px] opacity-10 font-bold select-none leading-none">🕋</div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Complete Journey Guide</span>
              </div>
              <h1 className="text-3xl font-black text-white">Hajj & Umrah</h1>
              <p className="text-sm text-indigo-200 mt-1">Step-by-step guide · Du'as · Ziyarat · Packing · Diary · Group Sync</p>
              {activeTrip && (
                <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 w-fit">
                  <Plane className="w-4 h-4 text-amber-300" />
                  <span className="text-sm text-white font-semibold">{activeTrip.destination}</span>
                  <span className="text-xs text-indigo-200">{new Date(activeTrip.start_date).toLocaleDateString()}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${new Date(activeTrip.start_date) <= new Date() ? 'bg-green-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
                    {new Date(activeTrip.start_date) <= new Date() ? 'Active' : 'Upcoming'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 sm:grid-cols-8 w-full h-auto gap-0.5 p-1">
            {[
              { id: 'guide', label: 'Guide', icon: BookOpen },
              { id: 'miqat', label: 'Miqat', icon: MapPin },
              { id: 'rituals', label: 'Rituals', icon: Moon },
              { id: 'ziyarat', label: 'Ziyarat', icon: Map },
              { id: 'packing', label: 'Packing', icon: Package },
              { id: 'diary', label: 'Diary', icon: Mic },
              { id: 'planner', label: 'AI Plan', icon: Navigation },
              { id: 'travel', label: 'Trip', icon: Plane },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id}
                  className="flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-bold h-auto">
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ── Guide Tab — Overview & Links ── */}
          <TabsContent value="guide" className="space-y-4 mt-4">
            {/* Journey Tracker (existing) */}
            <HajjUmrahJourneyTracker />

            {/* Official Links */}
            <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900">
                <p className="font-black text-purple-800 dark:text-purple-200 text-sm flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />Official Resources (Live Pricing & Visas)
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">Always check official portals for latest requirements, quotas and pricing</p>
              </div>
              <div className="divide-y divide-purple-50 dark:divide-purple-900/30">
                {OFFICIAL_LINKS.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors group">
                    <span className="text-xl flex-shrink-0">{link.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-300 group-hover:underline">{link.label}</p>
                      <p className="text-xs text-slate-500">{link.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>

            {/* Group Connect */}
            {pilgrimGroup || travelGroupChat ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <p className="font-bold text-sm text-teal-800 dark:text-teal-200">Travel Group Connected</p>
                </div>
                {pilgrimGroup && <p className="text-xs text-teal-700 dark:text-teal-300">Group: <strong>{pilgrimGroup.name}</strong> · {pilgrimGroup.member_count || '—'} members</p>}
                {travelGroupChat && <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">Chat: {travelGroupChat.name} — voice diary entries can be shared here</p>}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No travel group found</p>
                <p className="text-xs text-slate-400 mt-1">Create a group chat in Connect → the travel diary can share snippets with your group</p>
              </div>
            )}

            {/* Prayer & Mosques if active trip */}
            {activeTrip && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" />Prayer Times</CardTitle>
                  </CardHeader>
                  <CardContent><TripPrayerTimesPanel destination={activeTrip.destination} cities={activeTrip.cities} compact /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Compass className="w-4 h-4 text-purple-600" />Nearby Mosques</CardTitle>
                  </CardHeader>
                  <CardContent><NearbyMosquesPanel destination={activeTrip.destination} compact /></CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Miqat Tab ── */}
          <TabsContent value="miqat" className="mt-4">
            <MiqatGuide />
          </TabsContent>

          {/* ── Rituals Tab ── */}
          <TabsContent value="rituals" className="mt-4">
            <RitualStepsGuide />
          </TabsContent>

          {/* ── Ziyarat Tab ── */}
          <TabsContent value="ziyarat" className="mt-4">
            <ZiyaratGuide />
          </TabsContent>

          {/* ── Packing Tab ── */}
          <TabsContent value="packing" className="mt-4">
            <PackingListGuide />
          </TabsContent>

          {/* ── Voice Diary Tab ── */}
          <TabsContent value="diary" className="mt-4">
            <TravelDiary groupChatId={travelGroupChat?.id} />
          </TabsContent>

          {/* ── AI Planner Tab (existing) ── */}
          <TabsContent value="planner" className="mt-4">
            <EnhancedHajjUmrahPlanner />
          </TabsContent>

          {/* ── Trip/Travel Details Tab (existing) ── */}
          <TabsContent value="travel" className="mt-4 space-y-4">
            <TravelDetailsForm activeTrip={activeTrip} />
            {activeTrip && (
              <>
                <RitualChecklistPanel tripId={activeTrip.id} tripType="hajj" />
                <PilgrimCompanion tripId={activeTrip?.id} tripType="hajj" />
              </>
            )}
            {/* Full prayer times */}
            {activeTrip && (
              <TripPrayerTimesPanel destination={activeTrip.destination} cities={activeTrip.cities} />
            )}
            {/* Full mosques panel */}
            {activeTrip && <NearbyMosquesPanel destination={activeTrip.destination} />}

            {upcomingTrips.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Upcoming Journeys</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {upcomingTrips.map(trip => (
                    <div key={trip.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{trip.destination}</p>
                        <p className="text-xs text-slate-500">{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</p>
                      </div>
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}