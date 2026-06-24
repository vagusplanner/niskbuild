import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeGestureOnElement } from '@/components/utils/useSwipeGesture';
import { format, addMonths, subMonths, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, RefreshCw, Users, Moon, Sparkles, X, Menu
} from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import VerticalToolbar from '@/components/calendar/VerticalToolbar';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import EventForm from '@/components/calendar/EventForm';
import HijriCalendar from '@/components/islamic/HijriCalendar';
import PeriodTracker, { getPredictedPeriodDays } from '@/components/health/PeriodTracker';
import ConflictResolutionModal from '@/components/calendar/ConflictResolutionModal';
import ConflictNotificationBanner from '@/components/calendar/ConflictNotificationBanner';
import WelcomeQuestionnaire from '@/components/onboarding/WelcomeQuestionnaire';
import AdvancedMeetingScheduler from '@/components/calendar/AdvancedMeetingScheduler';
import DayHourlyView from '@/components/calendar/DayHourlyView';
import CalendarAgendaView from '@/components/calendar/CalendarAgendaView';
import CalendarTimelineView from '@/components/calendar/CalendarTimelineView';
import InteractiveCalendarLegend from '@/components/calendar/InteractiveCalendarLegend';
import SmartReminderBuilder from '@/components/calendar/SmartReminderBuilder';
import YearlyView from '@/components/calendar/YearlyView';
import WorkWeekView from '@/components/calendar/WorkWeekView';
import AIEventCategorizer from '@/components/calendar/AIEventCategorizer';
import AIMeetingAssistant from '@/components/calendar/AIMeetingAssistant';
import NaturalLanguageInput from '@/components/calendar/NaturalLanguageInput';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import ThreeDayView from '@/components/calendar/ThreeDayView';
import WorkloadView from '@/components/calendar/WorkloadView';
import ListView from '@/components/calendar/ListView';
import MultiWeekView from '@/components/calendar/MultiWeekView';
import DraggableEventGrid from '@/components/calendar/DraggableEventGrid';
import EventRescheduleConfirmation from '@/components/calendar/EventRescheduleConfirmation';
import EventTaskConverter from '@/components/calendar/EventTaskConverter';
import CalendarTaskPanel from '@/components/calendar/CalendarTaskPanel';
import AITaskScheduler from '@/components/calendar/AITaskScheduler';
import HabitTrackerPanel from '@/components/habits/HabitTrackerPanel';
import SmartTravelPlanner from '@/components/travel/SmartTravelPlanner';
import WellnessQuickPanel from '@/components/wellness/WellnessQuickPanel';
import DiscussionsPanel from '@/components/calendar/DiscussionsPanel';
import CalendarPersonalizationSettings from '@/components/calendar/CalendarPersonalizationSettings';
import MobileDayModal from '@/components/calendar/MobileDayModal';
import CalendarSharingModal from '@/components/calendar/CalendarSharingModal';
import GroupCalendarManager from '@/components/calendar/GroupCalendarManager';
import IslamicCalendarPanel from '@/components/calendar/IslamicCalendarPanel';
import UnifiedCalendarView from '@/components/calendar/UnifiedCalendarView';
import { usePublicHolidays } from '@/components/calendar/PublicHolidaysOverlay';
import TaskTimelineCalendar from '@/components/tasks/TaskTimelineCalendar';
import AISchedulePlanner from '@/components/calendar/AISchedulePlanner';

export default function CalendarPage() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAdvancedScheduler, setShowAdvancedScheduler] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDayView, setShowDayView] = useState(false);
  const [conflictToResolve, setConflictToResolve] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showFastingEvents, setShowFastingEvents] = useState(true);
  const [showSmartReminders, setShowSmartReminders] = useState(false);
  const [selectedEventForReminders, setSelectedEventForReminders] = useState(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);
  const [showAIMeetingAssistant, setShowAIMeetingAssistant] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState(null);
  const [showEventTaskConverter, setShowEventTaskConverter] = useState(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [taskPanelPinned, setTaskPanelPinned] = useState(false);
  const [showAITaskScheduler, setShowAITaskScheduler] = useState(false);
  const [showHabitPanel, setShowHabitPanel] = useState(false);
  const [habitPanelPinned, setHabitPanelPinned] = useState(false);
  const [showTravelPlanner, setShowTravelPlanner] = useState(false);
  const [showWellnessPanel, setShowWellnessPanel] = useState(false);
  const [showDiscussionsPanel, setShowDiscussionsPanel] = useState(false);
  const [discussionsPanelPinned, setDiscussionsPanelPinned] = useState(false);
  const [eventColorMode, setEventColorMode] = useState({});
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [showMobileDayModal, setShowMobileDayModal] = useState(false);
  const [mobileDayModalDate, setMobileDayModalDate] = useState(null);
  const [showVerticalToolbar, setShowVerticalToolbar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [showGroupCalendarManager, setShowGroupCalendarManager] = useState(false);
  const [showIslamicPanel, setShowIslamicPanel] = useState(false);
  const [showAISchedulePlanner, setShowAISchedulePlanner] = useState(false);
  const calendarRef = useRef(null);

  const queryClient = useQueryClient();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowVerticalToolbar(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Swipe navigation
  useSwipeGestureOnElement({
    ref: calendarRef,
    onSwipeRight: () => navigateMonth('prev'),
    onSwipeLeft: () => navigateMonth('next'),
    threshold: 50
  });

  // Global window events from child components
  useEffect(() => {
    const handleConvertEvent = (e) => setShowEventTaskConverter({ type: 'event', data: e.detail });
    const handleConvertTask = (e) => setShowEventTaskConverter({ type: 'task', data: e.detail });
    const handleToggleTask = () => setShowTaskPanel(prev => !prev);
    const handleToggleHabit = () => setShowHabitPanel(prev => !prev);
    window.addEventListener('convert-event-to-task', handleConvertEvent);
    window.addEventListener('convert-task-to-event', handleConvertTask);
    window.addEventListener('toggle-task-panel', handleToggleTask);
    window.addEventListener('toggle-habit-panel', handleToggleHabit);
    return () => {
      window.removeEventListener('convert-event-to-task', handleConvertEvent);
      window.removeEventListener('convert-task-to-event', handleConvertTask);
      window.removeEventListener('toggle-task-panel', handleToggleTask);
      window.removeEventListener('toggle-habit-panel', handleToggleHabit);
    };
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', user?.email],
    queryFn: () => user?.email
      ? base44.entities.Event.filter({ created_by: user.email }, '-start_date', 500)
      : Promise.resolve([]),
    enabled: !!user?.email,
  });

  // Deduplicate events (especially recurring prayer entries)
  const events = React.useMemo(() => {
    const seen = new Set();
    return rawEvents.filter(event => {
      if (!event.start_date) return true;
      const d = new Date(event.start_date);
      if (isNaN(d.getTime())) return false;
      const key = event.category === 'prayer' && event.title
        ? `${d.toISOString().split('T')[0]}-${event.title}-${d.toTimeString().slice(0, 5)}`
        : `${event.title}-${event.category}-${d.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawEvents]);

  const { data: settingsData = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  const settings = settingsData[0] || { prayer_enabled: true, week_starts_on: 'monday' };

  // Auto-sync Google Calendar on load
  useEffect(() => {
    if (settings?.google_calendar_connected && settings?.google_calendar_sync_enabled) {
      base44.functions.invoke('syncGoogleCalendar', { calendarId: 'primary' }).catch(() => {});
    }
  }, [settings?.google_calendar_connected]);

  // Show onboarding once per user
  useEffect(() => {
    if (!user || settingsLoading) return;
    const done = settingsData[0]?.onboarding_completed;
    const shownKey = `onboarding_completed_${user.email}`;
    if (!done && !localStorage.getItem(shownKey)) setShowOnboarding(true);
  }, [user, settingsData, settingsLoading]);

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => base44.entities.Period.list('-start_date', 50)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date', 50)
  });

  // Public holidays
  const currentYear = currentDate.getFullYear();
  const { data: publicHolidays = [] } = usePublicHolidays(
    settings?.public_holidays_country, currentYear, settings?.public_holidays_enabled
  );
  const nextYearNeeded = currentDate.getMonth() >= 10;
  const { data: publicHolidaysNextYear = [] } = usePublicHolidays(
    settings?.public_holidays_country, currentYear + 1,
    settings?.public_holidays_enabled && nextYearNeeded
  );
  const eventsWithHolidays = React.useMemo(() => {
    const allHolidays = [...publicHolidays, ...publicHolidaysNextYear];
    if (!allHolidays.length) return events;
    return [...events.filter(e => !e.isPublicHoliday), ...allHolidays];
  }, [events, publicHolidays, publicHolidaysNextYear]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const prev = queryClient.getQueryData(['events']);
      queryClient.setQueryData(['events'], (old = []) => [...old, { ...newEvent, id: 'temp-' + Date.now() }]);
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(['events'], ctx.prev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEditingEvent(null);
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const prev = queryClient.getQueryData(['events']);
      queryClient.setQueryData(['events'], (old = []) => old.map(e => e.id === id ? { ...e, ...data } : e));
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(['events'], ctx.prev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEditingEvent(null);
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const prev = queryClient.getQueryData(['events']);
      queryClient.setQueryData(['events'], (old = []) => old.filter(e => e.id !== id));
      return { prev };
    },
    onError: (_, __, ctx) => queryClient.setQueryData(['events'], ctx.prev),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] })
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveEvent = (eventData) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createEventMutation.mutate(eventData);
      base44.functions.invoke('trackAnalytics', {
        event_type: 'event_created', category: 'events',
        metadata: { event_category: eventData.category }
      }).catch(() => {});
    }
  };

  const handleEditEvent = (event) => { setEditingEvent(event); setShowEventForm(true); };
  const handleDeleteEvent = (id) => { if (confirm(t('calendar.deleteConfirm'))) deleteEventMutation.mutate(id); };

  const handleSyncError = (error, label) => {
    const msg = error?.response?.data?.error || error?.message || '';
    if (/403|401|Unauthorized/.test(msg)) {
      alert(`${label} is not connected. Please connect in Settings > Integrations.`);
    } else {
      alert(`${label} failed. Please try again.`);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const { data } = await base44.functions.invoke('fullCalendarSync', {});
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert(`Sync complete! Imported: ${data.imported || 0}, Exported: ${data.exported || 0}`);
    } catch (e) { handleSyncError(e, 'Google Calendar sync'); }
    finally { setSyncing(false); }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const navigateMonth = (dir) =>
    setCurrentDate(prev => dir === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));

  const selectedDateEvents = React.useMemo(() =>
    events.filter(e => {
      if (!e.start_date) return false;
      const d = new Date(e.start_date);
      return !isNaN(d) && isSameDay(d, selectedDate);
    }),
    [events, selectedDate]
  );

  const onboardingComplete = async () => {
    setShowOnboarding(false);
    localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
    if (!settingsData.length) {
      await base44.entities.UserSettings.create({ onboarding_completed: true });
    } else {
      await base44.entities.UserSettings.update(settingsData[0].id, { onboarding_completed: true });
    }
    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
  };

  // Shared event click handler
  const openEventDetails = (event) => { setSelectedEventForDetails(event); setShowEventDetails(true); };

  // ── Sliding panel helper ───────────────────────────────────────────────────
  const SlidingPanel = ({ show, onClose, children, width = 'w-80' }) => (
    <AnimatePresence>
      {show && (
        <>
          {isMobile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40]" onClick={onClose} />
          )}
          <motion.div
            initial={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
            animate={isMobile ? { x: 0 } : { width: 320, opacity: 1 }}
            exit={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto flex-shrink-0',
              isMobile ? `fixed right-0 z-[41] shadow-2xl ${width}` : 'hidden lg:block'
            )}
            style={isMobile ? { top: '3.5rem', bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' } : {}}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="h-[calc(100dvh-3.5rem)] lg:h-screen bg-transparent" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Onboarding */}
        {showOnboarding && user && (
          <WelcomeQuestionnaire onComplete={onboardingComplete} onSkip={onboardingComplete} />
        )}

        {/* Mobile toolbar FAB */}
        {isMobile && !showVerticalToolbar && (
          <button onClick={() => setShowVerticalToolbar(true)}
            className="fixed left-4 z-[45] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)', boxShadow:'0 4px 20px rgba(41,171,226,0.4)'}}
            style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="h-full lg:flex overflow-visible" ref={calendarRef}>

          {/* Left Vertical Toolbar */}
          <AnimatePresence>
            {showVerticalToolbar && (
              <>
                {isMobile && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[39]"
                    onClick={() => setShowVerticalToolbar(false)} />
                )}
                <motion.div
                  initial={isMobile ? { x: -280 } : false}
                  animate={isMobile ? { x: 0 } : {}}
                  exit={isMobile ? { x: -280 } : {}}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className={isMobile ? 'fixed left-0 z-[40] shadow-2xl bg-white dark:bg-slate-900 w-72 overflow-y-auto' : 'flex flex-none relative'}
                  style={isMobile ? { top: '3.5rem', bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' } : {}}
                >
                  <VerticalToolbar
                    selectedDate={selectedDate}
                    onNewEvent={() => { setEditingEvent(null); setShowEventForm(true); }}
                    onNaturalLanguage={() => setShowNaturalLanguage(true)}
                    onScheduleMeeting={() => setShowAdvancedScheduler(true)}
                    onToggleFasting={() => setShowFastingEvents(s => !s)}
                    onPlanTravel={() => setShowTravelPlanner(true)}
                    onWellness={() => setShowWellnessPanel(true)}
                    onDiscussions={() => setShowDiscussionsPanel(s => !s)}
                    showFasting={showFastingEvents}
                    onViewChange={setView}
                    currentView={view}
                    onDateSelect={setSelectedDate}
                    settings={settingsData?.[0]}
                    events={events}
                    eventColorMode={eventColorMode}
                    onEventColorChange={(cat, color) => setEventColorMode(prev => ({ ...prev, [cat]: color }))}
                    onOpenSettings={() => setShowCalendarSettings(true)}
                    onToggleTasks={() => setShowTaskPanel(s => !s)}
                    onToggleHabits={() => setShowHabitPanel(s => !s)}
                    onToggleIslamic={() => setShowIslamicPanel(s => !s)}
                    showIslamicPanel={showIslamicPanel}
                    onClose={() => setShowVerticalToolbar(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>

            {/* Header */}
            <div className="flex-none border-b-2 backdrop-blur-sm" style={{background:'linear-gradient(135deg, rgba(13,26,42,0.95), rgba(27,42,74,0.95))', borderColor:'rgba(41,171,226,0.4)'}}>
              <div className="px-2 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg shadow-sm hidden sm:flex" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)'}}>
                       <CalendarIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-black text-base hidden sm:block tracking-tight" style={{color:'#29ABE2'}}>{t('nav.calendar')}</span>
                    <HijriCalendar compact={true} />
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center rounded-lg overflow-hidden" style={{border:'1px solid rgba(41,171,226,0.3)'}}>
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')} className="h-8 w-8 sm:h-9 sm:w-9 rounded-none" style={{color:'#29ABE2'}}>
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                        className="h-8 px-2 sm:h-9 sm:px-4 rounded-none text-xs sm:text-sm font-semibold" style={{borderLeft:'1px solid rgba(41,171,226,0.2)', borderRight:'1px solid rgba(41,171,226,0.2)', color:'#29ABE2'}}>
                        {t('calendar.today')}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')} className="h-8 w-8 sm:h-9 sm:w-9 rounded-none" style={{color:'#29ABE2'}}>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowSharingModal(true)} className="hidden lg:flex items-center gap-2">
                      <Users className="w-4 h-4" />{t('common.share')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowGroupCalendarManager(true)} className="hidden lg:flex items-center gap-2">
                      <Users className="w-4 h-4" />{t('connect.groups')}
                    </Button>
                    <Button
                      onClick={() => setShowAISchedulePlanner(true)}
                      size="sm"
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold gap-1.5 shadow-md shadow-violet-500/20 border-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">AI Plan</span>
                    </Button>
                    <button onClick={handleRefresh}
                      className="flex items-center justify-center h-8 w-8 rounded-lg transition-all" style={{background:'rgba(29,111,184,0.15)', border:'1px solid rgba(41,171,226,0.3)', color:'#29ABE2'}}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto bg-[#EEF4FA]/90 dark:bg-[#0a2e2a]/80 p-2 sm:p-4 backdrop-blur-sm">
              <ConflictNotificationBanner onResolveClick={setConflictToResolve} />

              {showLegend && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <InteractiveCalendarLegend compact />
                </motion.div>
              )}

              {view === 'month' && (
                <DraggableEventGrid
                  currentDate={currentDate}
                  events={eventsWithHolidays}
                  onEventMove={(oldEvent, newEventData, oldDate, newDate) =>
                    setRescheduleConfirmation({ event: oldEvent, newData: newEventData, oldDate, newDate })}
                  onEventClick={openEventDetails}
                  onDayClick={(date) => { setMobileDayModalDate(date); setShowMobileDayModal(true); }}
                  weekStartsOn={1}
                  showFastingDays={showFastingEvents}
                />
              )}
              {view === 'week' && <WeekView currentDate={currentDate} events={eventsWithHolidays} onEventClick={openEventDetails} weekStartsOn={1} showFastingDays={showFastingEvents} />}
              {view === 'work-week' && <WorkWeekView events={events} selectedDate={selectedDate} onDateChange={setSelectedDate} onEventClick={openEventDetails} />}
              {view === 'day' && <DayView currentDate={selectedDate} events={events} onEventClick={openEventDetails} showFastingDays={showFastingEvents} />}
              {view === '3day' && <ThreeDayView currentDate={selectedDate} events={events} onEventClick={openEventDetails} onDateClick={(d) => { setSelectedDate(d); setEditingEvent(null); setShowEventForm(true); }} />}
              {view === 'agenda' && <CalendarAgendaView events={events} onEventClick={openEventDetails} currentMonth={currentDate} />}
              {view === 'timeline' && <CalendarTimelineView events={events} onEventClick={openEventDetails} currentDate={currentDate} />}
              {view === 'year' && <YearlyView events={events} selectedDate={selectedDate} onDateSelect={(d) => { setSelectedDate(d); setView('day'); }} onEventClick={openEventDetails} />}
              {view === 'list' && <ListView currentDate={currentDate} events={events} onEventClick={openEventDetails} />}
              {view === 'workload' && <WorkloadView currentDate={currentDate} events={events} onDateClick={(d) => { setSelectedDate(d); setEditingEvent(null); setShowEventForm(true); }} />}
              {view === 'unified' && <UnifiedCalendarView events={events} onEventClick={openEventDetails} onEditEvent={handleEditEvent} />}
              {view === 'multiweek' && <MultiWeekView currentDate={currentDate} events={events} onEventClick={openEventDetails} weekStartsOn={1} weeksToShow={4} />}
              {view === 'task-timeline' && (
                <TaskTimelineCalendar onTaskClick={(task) => {
                  if (task.event_id) {
                    const ev = events.find(e => e.id === task.event_id);
                    if (ev) openEventDetails(ev);
                  }
                }} />
              )}
            </div>
          </div>

          {/* Right Panels — Tasks, Habits, Islamic, Discussions */}
          <SlidingPanel show={showTaskPanel} onClose={() => setShowTaskPanel(false)}>
            <CalendarTaskPanel selectedDate={selectedDate} isPinned={taskPanelPinned}
              onTogglePin={() => setTaskPanelPinned(s => !s)}
              onTaskClick={(task) => { const e = task.event_id && events.find(ev => ev.id === task.event_id); if (e) openEventDetails(e); }}
              onAISchedule={() => setShowAITaskScheduler(true)}
              onClose={() => setShowTaskPanel(false)} />
          </SlidingPanel>

          <SlidingPanel show={showHabitPanel} onClose={() => setShowHabitPanel(false)}>
            <HabitTrackerPanel selectedDate={selectedDate} isPinned={habitPanelPinned}
              onTogglePin={() => setHabitPanelPinned(s => !s)}
              onClose={() => setShowHabitPanel(false)} />
          </SlidingPanel>

          <SlidingPanel show={showIslamicPanel} onClose={() => setShowIslamicPanel(false)}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('islamic.title')}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowIslamicPanel(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <IslamicCalendarPanel selectedDate={selectedDate} />
            </div>
          </SlidingPanel>

          <AnimatePresence>
            {showDiscussionsPanel && (
              <>
                {isMobile && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40]" onClick={() => setShowDiscussionsPanel(false)} />
                )}
                <motion.div
                  initial={isMobile ? { x: '100%' } : false}
                  animate={isMobile ? { x: 0 } : {}}
                  exit={isMobile ? { x: '100%' } : {}}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className={cn(
                    'bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full overflow-hidden',
                    isMobile ? 'fixed right-0 top-16 bottom-16 z-[41] shadow-2xl' : 'hidden lg:block lg:flex-none'
                  )}
                  style={{ width: isMobile ? '80vw' : (discussionsPanelPinned ? '320px' : '56px') }}
                >
                  <DiscussionsPanel isPinned={discussionsPanelPinned} onTogglePin={() => setDiscussionsPanelPinned(s => !s)}
                    onEventClick={openEventDetails} onClose={() => setShowDiscussionsPanel(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ── Modals ── */}

        <AITaskScheduler isOpen={showAITaskScheduler} onClose={() => setShowAITaskScheduler(false)} tasks={tasks} events={events} />

        {/* Event Form */}
        <AnimatePresence>
          {showEventForm && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                onClick={() => { setShowEventForm(false); setEditingEvent(null); }} />
              <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: isMobile ? 60 : 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: isMobile ? 60 : 20 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="pointer-events-auto w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
                  <EventForm isOpen onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
                    onSave={handleSaveEvent} event={editingEvent} selectedDate={selectedDate}
                    allEvents={events} settings={settings}
                    renderExtraComponents={(formEvent) =>
                      formEvent && !editingEvent ? (
                        <AIEventCategorizer event={formEvent}
                          onCategorize={(cat) => handleSaveEvent({ ...formEvent, category: cat.category, priority: cat.priority })} />
                      ) : null
                    } />
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Day Hourly View */}
        <AnimatePresence>
          {showDayView && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                onClick={() => setShowDayView(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-4 md:inset-0 m-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:h-fit max-h-[95vh] z-[101]">
                <DayHourlyView selectedDate={selectedDate} events={selectedDateEvents}
                  onAddEvent={() => { setShowDayView(false); setEditingEvent(null); setShowEventForm(true); }}
                  onEditEvent={(e) => { setShowDayView(false); handleEditEvent(e); }}
                  onClose={() => setShowDayView(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Advanced Scheduler */}
        <AnimatePresence>
          {showAdvancedScheduler && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                onClick={() => setShowAdvancedScheduler(false)} />
              <motion.div
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="sticky top-0 bg-white dark:bg-slate-900 rounded-t-3xl p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />{t('calendar.aiAssistant')}
                  </h2>
                  <button onClick={() => setShowAdvancedScheduler(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                <div className="p-4">
                  <AdvancedMeetingScheduler isOpen onClose={() => setShowAdvancedScheduler(false)}
                    onSelectTime={(td) => {
                      setEditingEvent({ start_date: td.start_date, end_date: td.end_date, title: '', category: 'work' });
                      setShowEventForm(true);
                      setShowAdvancedScheduler(false);
                    }} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Natural Language */}
        <AnimatePresence>
          {showNaturalLanguage && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                onClick={() => setShowNaturalLanguage(false)} />
              <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 shadow-2xl pointer-events-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600" />{t('calendar.addEvent')}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowNaturalLanguage(false)}><X className="w-5 h-5" /></Button>
                  </div>
                  <NaturalLanguageInput
                    onEventCreated={(data) => { createEventMutation.mutate(data); setShowNaturalLanguage(false); }}
                    onClose={() => setShowNaturalLanguage(false)} />
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Conflict + Reminders + Details + Reschedule + Converter */}
        {conflictToResolve && (
          <ConflictResolutionModal conflict={conflictToResolve} events={events}
            onClose={() => setConflictToResolve(null)} onResolve={() => setConflictToResolve(null)} />
        )}
        <EventDetailsModal event={selectedEventForDetails} isOpen={showEventDetails}
          onClose={() => { setShowEventDetails(false); setSelectedEventForDetails(null); }}
          onEdit={(e) => { setShowEventDetails(false); handleEditEvent(e); }}
          onDelete={handleDeleteEvent} />
        <SmartReminderBuilder event={selectedEventForReminders} isOpen={showSmartReminders}
          onClose={() => { setShowSmartReminders(false); setSelectedEventForReminders(null); }}
          onSave={(reminders) => {
            if (selectedEventForReminders)
              updateEventMutation.mutate({ id: selectedEventForReminders.id, data: { reminders: reminders.map(r => ({ minutes_before: r.time_before_minutes, type: 'notification' })) } });
          }} />
        {showAIMeetingAssistant && selectedMeeting && (
          <AIMeetingAssistant meeting={selectedMeeting} onClose={() => { setShowAIMeetingAssistant(false); setSelectedMeeting(null); }} />
        )}
        <EventRescheduleConfirmation isOpen={!!rescheduleConfirmation}
          onClose={() => setRescheduleConfirmation(null)}
          event={rescheduleConfirmation?.event} oldDate={rescheduleConfirmation?.oldDate} newDate={rescheduleConfirmation?.newDate}
          onConfirm={() => {
            if (rescheduleConfirmation) {
              updateEventMutation.mutate({ id: rescheduleConfirmation.event.id, data: rescheduleConfirmation.newData });
              setRescheduleConfirmation(null);
            }
          }} />
        {showEventTaskConverter && (
          <EventTaskConverter isOpen onClose={() => setShowEventTaskConverter(null)}
            sourceType={showEventTaskConverter.type} sourceData={showEventTaskConverter.data}
            onConvert={async (data) => {
              if (showEventTaskConverter.type === 'event') {
                await base44.entities.Task.create(data);
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              } else {
                await createEventMutation.mutateAsync(data);
              }
              setShowEventTaskConverter(null);
            }} />
        )}

        {/* Travel + Wellness + Mobile Day + Settings + Sharing */}
        <SmartTravelPlanner isOpen={showTravelPlanner} onClose={() => setShowTravelPlanner(false)} selectedDate={selectedDate} />
        <AnimatePresence>
          {showWellnessPanel && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setShowWellnessPanel(false)} />
              <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                  className="pointer-events-auto w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-t-2xl sm:rounded-2xl">
                  <WellnessQuickPanel selectedDate={selectedDate} onClose={() => setShowWellnessPanel(false)}
                    onEventCreated={(data) => { createEventMutation.mutate(data); setShowWellnessPanel(false); }} />
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
        <MobileDayModal isOpen={showMobileDayModal} onClose={() => setShowMobileDayModal(false)} date={mobileDayModalDate}
          events={mobileDayModalDate ? events.filter(e => { const d = new Date(e.start_date); return !isNaN(d) && isSameDay(d, mobileDayModalDate); }) : []}
          onEventClick={openEventDetails}
          onAddEvent={() => { setSelectedDate(mobileDayModalDate); setEditingEvent(null); setShowEventForm(true); }} />
        {showCalendarSettings && <CalendarPersonalizationSettings onClose={() => setShowCalendarSettings(false)} />}
        <CalendarSharingModal isOpen={showSharingModal} onClose={() => setShowSharingModal(false)} />
        <GroupCalendarManager isOpen={showGroupCalendarManager} onClose={() => setShowGroupCalendarManager(false)} />
        <AISchedulePlanner
          isOpen={showAISchedulePlanner}
          onClose={() => setShowAISchedulePlanner(false)}
          onEventsCreated={() => queryClient.invalidateQueries({ queryKey: ['events'] })}
        />
      </div>
    </PullToRefresh>
  );
}