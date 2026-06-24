import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Plus, Moon, Map, Mail, AlertTriangle, Globe, ChevronRight, ArrowLeft, Shield, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';
import { cn } from '@/lib/utils';

// Travel Components
import HolidayCard from '@/components/calendar/HolidayCard';
import HolidayForm from '@/components/calendar/HolidayForm';
import ItineraryImporter from '@/components/holiday/ItineraryImporter';
import TravelAlertsPanel from '@/components/holiday/TravelAlertsPanel';
import AITripPlanner from '@/components/holiday/AITripPlanner';
import UnifiedHolidayAIPanel from '@/components/assistant/UnifiedHolidayAIPanel';
import SmartTripPlanner from '@/components/travel/SmartTripPlanner';
import GmailBookingScanner from '@/components/travel/GmailBookingScanner';
import IslamicItineraryBuilder from '@/components/travel/IslamicItineraryBuilder';
import TravelMessageParser from '@/components/travel/TravelMessageParser';
import TravelItineraryBuilder from '@/components/travel/TravelItineraryBuilder';
import IslamicTravelDashboard from '@/components/travel/IslamicTravelDashboard';
import ProactiveTravelAlertsPanel from '@/components/travel/ProactiveTravelAlertsPanel';
import GroupSafetyMap from '@/components/safety/GroupSafetyMap';
import LiveLocationSharing from '@/components/safety/LiveLocationSharing';

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'trips',     label: 'My Trips',    icon: Plane,         desc: 'Your planned & booked trips' },
  { id: 'packing',   label: 'Packing',     icon: Map,           desc: 'AI packing lists by climate' },
  { id: 'planner',   label: 'AI Planner',  icon: Globe,         desc: 'Smart AI itinerary builder' },
  { id: 'tools',     label: 'Import & Scan', icon: Mail,        desc: 'Gmail scanner, message parser' },
  { id: 'safety',    label: 'Safety',      icon: Shield,        desc: 'Live location & group map' },
  { id: 'alerts',    label: 'Alerts',      icon: AlertTriangle, desc: 'Real-time travel warnings' },
];

function TabBar({ active, onChange, islamicEdition }) {
  const tabs = islamicEdition
    ? [...TABS, { id: 'islamic', label: 'Islamic', icon: Moon, desc: 'Halal map, prayer abroad' }]
    : TABS;
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
              isActive
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TravelPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('trips');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [islamicBuilderHoliday, setIslamicBuilderHoliday] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const { isIslamicEdition } = useIslamicEdition();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', user?.email],
    queryFn: () => user?.email
      ? base44.entities.Holiday.filter({ created_by: user.email }, '-start_date', 200)
      : Promise.resolve([]),
    enabled: !!user?.email,
  });

  const createHolidayMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: async (holiday) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowHolidayForm(false);
      setEditingHoliday(null);
      try {
        await base44.entities.Event.create({
          title: `🏖️ ${holiday.title}`,
          description: holiday.notes || `Trip to ${holiday.destination}`,
          start_date: `${holiday.start_date}T00:00:00`,
          end_date: `${holiday.end_date}T23:59:59`,
          is_all_day: true,
          category: 'holiday',
          location: holiday.destination
        });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } catch {}
      if (isIslamicEdition && holiday.destination) setIslamicBuilderHoliday(holiday);
    }
  });

  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setShowHolidayForm(false); setEditingHoliday(null); }
  });

  const handleSaveHoliday = (data) => {
    if (editingHoliday) updateHolidayMutation.mutate({ id: editingHoliday.id, data });
    else createHolidayMutation.mutate(data);
  };

  const handleRefresh = async () => queryClient.invalidateQueries({ queryKey: ['holidays'] });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen pb-20">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-5">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 shadow-lg">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Plane className="w-5 h-5 text-amber-200" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Travel & Trips</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">Travel Hub</h1>
                <p className="text-sm text-amber-100 mt-0.5">Plan, book, explore — AI-powered travel</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowTripPlanner(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> AI Plan
                </Button>
                <Button size="sm" onClick={() => { setEditingHoliday(null); setShowHolidayForm(true); }}
                  className="bg-white text-amber-600 hover:bg-amber-50 border-0 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Trip
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Tab bar */}
          <TabBar active={activeTab} onChange={setActiveTab} islamicEdition={isIslamicEdition} />

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {/* MY TRIPS */}
              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {holidays.length > 0 ? (
                    <>
                      {holidays.map((holiday, index) => (
                        <HolidayCard
                          key={holiday.id}
                          holiday={holiday}
                          onEdit={(h) => { setEditingHoliday(h); setShowHolidayForm(true); }}
                          onDelete={(id) => { base44.entities.Holiday.delete(id); queryClient.invalidateQueries({ queryKey: ['holidays'] }); }}
                          onSelectTrip={(h) => setSelectedTrip(h)}
                          index={index}
                        />
                      ))}
                      {/* Islamic per-trip builder buttons */}
                      {isIslamicEdition && !islamicBuilderHoliday && (
                        <div className="flex gap-2 flex-wrap pt-2">
                          {holidays.slice(0, 5).map(h => (
                            <button key={h.id} onClick={() => setIslamicBuilderHoliday(h)}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200 transition-colors">
                              <Moon className="w-3 h-3" /> Islamic itinerary — {h.title}
                            </button>
                          ))}
                        </div>
                      )}
                      {isIslamicEdition && islamicBuilderHoliday && (
                        <IslamicItineraryBuilder holiday={islamicBuilderHoliday} onClose={() => setIslamicBuilderHoliday(null)} />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <Plane className="w-14 h-14 text-amber-200 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No trips yet</h3>
                      <p className="text-sm text-slate-500 mb-4">Add your first trip and let AI build the itinerary.</p>
                      <Button onClick={() => setShowHolidayForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                        <Plus className="w-4 h-4" /> Plan Your First Trip
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* AI PLANNER */}
              {activeTab === 'planner' && (
                <div className="space-y-5">
                  <SmartTripPlanner />
                  <TravelItineraryBuilder />
                  <UnifiedHolidayAIPanel onCreateHoliday={handleSaveHoliday} />
                </div>
              )}

              {/* IMPORT & SCAN */}
              {activeTab === 'tools' && (
                <div className="space-y-5">
                  <TravelMessageParser />
                  <GmailBookingScanner />
                  <ItineraryImporter onItineraryImported={handleSaveHoliday} />
                </div>
              )}

              {/* SAFETY */}
              {activeTab === 'safety' && (
                <div className="space-y-5">
                  {selectedTrip ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <button onClick={() => setSelectedTrip(null)} className="text-amber-500 hover:underline flex items-center gap-1">
                          <ArrowLeft className="w-4 h-4" /> All trips
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedTrip.title}</span>
                      </div>
                      <LiveLocationSharing tripId={selectedTrip.id} contextType="trip" groupName={selectedTrip.title} />
                      <GroupSafetyMap tripId={selectedTrip.id} contextType="trip" groupName={selectedTrip.title} />
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Select a trip to enable live location sharing and group safety map.</p>
                      {holidays.map(h => (
                        <button key={h.id} onClick={() => setSelectedTrip(h)}
                          className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all text-left">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{h.title}</p>
                            <p className="text-xs text-slate-500">{h.destination} · {h.start_date}</p>
                          </div>
                          <Shield className="w-4 h-4 text-amber-400" />
                        </button>
                      ))}
                      {!holidays.length && <p className="text-sm text-slate-400 text-center py-8">Add a trip first to use safety features.</p>}
                    </div>
                  )}
                </div>
              )}

              {/* PACKING */}
              {activeTab === 'packing' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 border border-sky-200 dark:border-sky-800/40 p-5 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mx-auto">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">AI Packing Assistant</h3>
                      <p className="text-sm text-slate-500 mt-1">Get a climate-based packing list for any of your trips. Check off items as you pack.</p>
                    </div>
                    <Link to="/TravelPackingAssistant">
                      <button className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm hover:opacity-90 transition-opacity">
                        <Package className="w-4 h-4" /> Open Packing Assistant
                      </button>
                    </Link>
                  </div>
                  {holidays.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Quick-pack a trip</p>
                      {holidays.slice(0, 5).map(h => (
                        <Link key={h.id} to="/TravelPackingAssistant">
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-sky-300 transition-colors cursor-pointer">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{h.destination || h.title}</p>
                              <p className="text-xs text-slate-400">{h.start_date} – {h.end_date}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ALERTS */}
              {activeTab === 'alerts' && (
                <div className="space-y-5">
                  <ProactiveTravelAlertsPanel />
                  {holidays.filter(h => h.status === 'booked').map(holiday => (
                    <TravelAlertsPanel key={holiday.id} holiday={holiday} />
                  ))}
                  {!holidays.filter(h => h.status === 'booked').length && (
                    <p className="text-sm text-slate-400 text-center py-8">Mark a trip as "booked" to receive real-time travel alerts.</p>
                  )}
                </div>
              )}

              {/* ISLAMIC (Islamic edition only) */}
              {activeTab === 'islamic' && isIslamicEdition && (
                <div className="space-y-5">
                  <IslamicTravelDashboard />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modals */}
        <HolidayForm
          isOpen={showHolidayForm}
          onClose={() => { setShowHolidayForm(false); setEditingHoliday(null); }}
          onSave={handleSaveHoliday}
          holiday={editingHoliday}
        />
        <AITripPlanner open={showTripPlanner} onClose={() => setShowTripPlanner(false)} />
      </div>
    </PullToRefresh>
  );
}