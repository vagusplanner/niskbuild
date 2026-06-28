// Apply lang+dir SYNCHRONOUSLY on every load — before React renders
(function () {
  try {
    var lang = localStorage.getItem('vagus_language') || 'en';
    var rtl = lang === 'ar' || lang === 'ur';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    // Sync i18next key too
    localStorage.setItem('i18nextLng', lang);
  } catch (e) {}
})();

import React, { useState, useEffect } from 'react';
            import { Link, useNavigate, useLocation } from 'react-router-dom';
      import { useQueryClient } from '@tanstack/react-query';
            import { createPageUrl } from './utils';
            import { motion, AnimatePresence } from 'framer-motion';
            import '@/components/i18n/i18n';
      import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
      import ThemeToggle from '@/components/ThemeToggle';
      import { FloatingProvider } from '@/components/ui/floating-manager';
import { AISchedulingProvider } from '@/components/assistant/AISchedulingBridge';
      import { 
        Calendar, 
        CalendarDays,
        TrendingUp,
        Target,
        Plane, 
        Settings, 
        Menu, 
        X,
        Home,
        Moon,
        Star,
        MessageCircle,
        Users,
        User,
        Activity,
        Search,
        ArrowLeft,
        Mail,
        HelpCircle,
        CreditCard,
        CheckSquare,
        MessageSquare,
        Brain,
        MoreHorizontal,
        Heart,
        Compass,
        Map,
        Zap,
        Utensils,
        BookOpen,
        Crown,
        History as HistoryIcon,
        Sparkles
      } from 'lucide-react';
      import { cn } from '@/lib/utils';
      import { Toaster } from 'sonner';
      import { base44 } from '@/api/base44Client';
      import { useQuery } from '@tanstack/react-query';
import { useRoleAccess } from '@/components/auth/useRoleAccess';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';
import { useTranslation } from 'react-i18next';
import SidebarTools from '@/components/sidebar/SidebarTools';
      // Critical: loaded immediately
      import PullToRefresh from '@/components/mobile/PullToRefresh';
      import UserAvatar from '@/components/shared/UserAvatar';
      import FontLoader from '@/components/i18n/FontLoader';
      import SmartNotificationCenter from '@/components/notifications/SmartNotificationCenter';
      import RealTimeNotificationProvider from '@/components/notifications/RealTimeNotificationProvider';
      import Breadcrumbs from '@/components/navigation/Breadcrumbs';
      import SplashScreen from '@/components/SplashScreen';
      import { usePushNotifications, usePrayerTimeNotifications } from '@/components/notifications/PushNotificationEngine';
      import { MobileOptimizer } from '@/components/mobile/MobileOptimizer';
      import ServiceWorkerManager from '@/components/mobile/ServiceWorkerManager';
      import TouchOptimizations from '@/components/mobile/TouchOptimizations';
      import EnhancedOfflineSync from '@/components/offline/EnhancedOfflineSync';
      import WelcomeEmailTrigger from '@/components/auth/WelcomeEmailTrigger';
      import CapacitorPushRegistration from '@/components/notifications/CapacitorPushRegistration';

      // Non-critical: lazy loaded after paint
      const KeyboardShortcutsModal = React.lazy(() => import('@/components/shared/KeyboardShortcutsModal'));
      const SuperAgent = React.lazy(() => import('@/components/ai/SuperAgent'));
      function SuperAgentManager() {
        const [isOpen, setIsOpen] = React.useState(false);
        React.useEffect(() => {
          const handler = () => setIsOpen(true);
          window.addEventListener('open_super_agent', handler);
          return () => window.removeEventListener('open_super_agent', handler);
        }, []);
        return <SuperAgent isOpen={isOpen} onClose={() => setIsOpen(false)} />;
      }
      const UnifiedFAB = React.lazy(() => import('@/components/unified/UnifiedFAB'));
      const OnboardingFlow = React.lazy(() => import('@/components/onboarding/OnboardingFlow'));
      const EnhancedOnboardingFlow = React.lazy(() => import('@/components/onboarding/EnhancedOnboardingFlow'));
      const GuidedTour = React.lazy(() => import('@/components/onboarding/GuidedTour'));
      const SupportFAB = React.lazy(() => import('@/components/support/SupportFAB').catch(() => ({ default: () => null })));
      const GlobalSearch = React.lazy(() => import('@/components/search/GlobalSearch'));
      const PWAInstallPrompt = React.lazy(() => import('@/components/pwa/PWAInstallPrompt').catch(() => ({ default: () => null })));
      const OfflineIndicator = React.lazy(() => import('@/components/pwa/OfflineIndicator'));
      const HelpCenter = React.lazy(() => import('@/components/help/HelpCenter'));
      const HalalRestaurantFinder = React.lazy(() => import('@/components/halal/HalalRestaurantFinder'));
      const SyncManager = React.lazy(() => import('@/components/offline/SyncManager'));
      const ConflictResolver = React.lazy(() => import('@/components/offline/ConflictResolver'));
      const CookieBanner = React.lazy(() => import('@/components/legal/CookieBanner'));
      const CopyrightFooter = React.lazy(() => import('@/components/legal/CopyrightFooter'));
      const LegalConsentFlow = React.lazy(() => import('@/components/legal/LegalConsentFlow'));
      const MorningBriefingAfterFajr = React.lazy(() => import('@/components/ai/MorningBriefingAfterFajr').catch(() => ({ default: () => null })));
      const DuaCollectionsPopup = React.lazy(() => import('@/components/islamic/DuaCollectionsPopup').catch(() => ({ default: () => null })));
      const ArabicKeyboardHelper = React.lazy(() => import('@/components/islamic/ArabicKeyboardHelper').catch(() => ({ default: () => null })));
      // VoiceFAB merged into UnifiedFAB
      const AIPlanningAssistant = React.lazy(() => import('@/components/assistant/AIPlanningAssistant'));
      // UnifiedAIButton merged into UnifiedFAB

// Simplified navigation structure: 5 main tabs + Account
// Removed: LifeGoals → Goals (merged into Dashboard sidebar)
// Removed: Travel → Now in Calendar context
// Removed: Wellness, Health → Consolidated, now under Islam or Settings
// Moved: Profile/Settings/Billing → Single Account page

const ROOT_PAGES = ['Dashboard', 'Calendar', 'Islam', 'Goals', 'Connect', 'Account'];

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splash_shown'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false); // kept for legacy, unused
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [blockingOverlay, setBlockingOverlay] = useState(false);
  const [tourInterests, setTourInterests] = useState([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showHalalFinder, setShowHalalFinder] = useState(false);
  const [showPlanningAssistant, setShowPlanningAssistant] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [planningPeriod, setPlanningPeriod] = useState('week');
  const [isMobile, setIsMobile] = useState(false);
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Enhanced theme listener with iOS support
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = (e) => {
      // Check localStorage first — default to LIGHT unless explicitly set to dark
      const saved = localStorage.getItem('theme');
      let isDark;
      
      if (saved) {
        isDark = saved === 'dark';
      } else {
        // Default to light mode; only follow system if user explicitly opted in
        isDark = false;
      }
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.colorScheme = 'light';
      }
      
      // iOS-specific: Update status bar and theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#060f1e' : '#0f3460');
      }
      
      // iOS-specific: Update apple-mobile-web-app-status-bar-style
      let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!statusBarMeta) {
        statusBarMeta = document.createElement('meta');
        statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
        document.head.appendChild(statusBarMeta);
      }
      statusBarMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
    };
    
    // Set initial theme
    updateTheme();
    
    // Listen for changes (iOS supports this since iOS 13)
    darkModeQuery.addEventListener('change', updateTheme);
    
    return () => darkModeQuery.removeEventListener('change', updateTheme);
  }, []);
  
  // Set iOS-specific meta tags for PWA
  useEffect(() => {
    // Theme color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      metaThemeColor.content = '#0f3460';
      document.head.appendChild(metaThemeColor);
    }
    
    // iOS status bar style
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta');
      statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
      statusBarMeta.content = 'default';
      document.head.appendChild(statusBarMeta);
    }
    
    // Viewport for iOS (prevent zoom)
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }, []);
  
  // Persist sub-routes for each mobile tab
  const [tabHistory, setTabHistory] = useState({
    Dashboard: ['/Dashboard'],
    Calendar: ['/Calendar'],
    Travel: ['/Travel'],
    Islam: ['/Islam'],
    Wellness: ['/Wellness'],
    Connect: ['/Connect'],
    Profile: ['/Profile'],
    Settings: ['/Settings']
  });

  const { data: settingsData } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        return await base44.entities.UserSettings.list();
      } catch {
        return [];
      }
    },
  });
  const settings = settingsData ?? [];

  // Sync language from DB on first load (only if local has no preference saved yet)
  useEffect(() => {
    if (settings.length > 0 && settings[0]?.language) {
      const dbLang = settings[0].language;
      const localLang = localStorage.getItem('vagus_language');
      // Only override if user has NEVER set a local preference (blank localStorage)
      if (!localLang && dbLang !== 'en') {
        localStorage.setItem('vagus_language', dbLang);
        localStorage.setItem('i18nextLng', dbLang);
        const rtl = dbLang === 'ar' || dbLang === 'ur';
        document.documentElement.setAttribute('lang', dbLang);
        document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
        window.location.reload();
      }
    }
  }, [settings]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { role, canAccessFeature } = useRoleAccess();
  const {
    isIslamicEdition = false,
    isLoading: islamicEditionLoading = false,
    islamicMode = false,
    userSettings = null,
  } = useIslamicEdition();

  // NAV_ITEMS built here so islamicEditionLoading / isIslamicEdition are already resolved
  const NAV_ITEMS = [
    { name: t('nav.home'),     icon: Home,          page: 'Dashboard',     description: t('dashboard.title') },
    { name: t('nav.calendar'), icon: Calendar,      page: 'Calendar',      description: t('calendar.title') },
    { name: t('nav.islamic'),  icon: Moon,          page: 'Islam',         description: t('prayer.title'), islamicOnly: true },
    { name: 'Goals',           icon: Target,        page: 'Goals',         description: 'Life & spiritual goals' },
    { name: t('nav.connect'),  icon: MessageCircle, page: 'Connect',       description: t('connect.title') },
    { name: t('nav.account'),  icon: Settings,      page: 'Account',       description: 'Settings & billing' },
    // Admin routes (hidden unless admin)
    { name: t('nav.admin'),    icon: Settings,      page: 'Admin',         description: t('nav.admin'), adminOnly: true },
    { name: t('nav.feedback'), icon: MessageSquare, page: 'FeedbackManagement', description: t('nav.feedback'), adminOnly: true },
    { name: 'Version History', icon: HistoryIcon,   page: 'VersionHistory', description: 'Track all changes', adminOnly: true },
  ];

  // Push notification engine — prayer times, Zakat reminders, Hadith
  usePushNotifications({ islamicMode, userEmail: user?.email });
  usePrayerTimeNotifications({ settings: userSettings ?? settings[0] ?? null, islamicMode });

  // Build mobile tabs dynamically — always 5 slots, Islam replaces Travel ONLY when confirmed Islamic Edition
  // During loading, show Travel to avoid flicker
  const showIslamTab = !islamicEditionLoading && isIslamicEdition;
  // Mobile: 5 main tabs only (no nested menus)
  const MOBILE_TAB_ITEMS = [
    { name: t('nav.home'),     icon: Home,          page: 'Dashboard' },
    { name: t('nav.calendar'), icon: Calendar,      page: 'Calendar' },
    showIslamTab ? { name: t('nav.islamic'), icon: Moon, page: 'Islam' } : { name: 'Goals', icon: Target, page: 'Goals' },
    { name: t('nav.connect'),  icon: MessageCircle, page: 'Connect' },
    { name: t('nav.account'),  icon: Settings,      page: 'Account' },
  ];

  // Check legal consent on first visit (only once per user)
  useEffect(() => {
    if (!user?.email) return;
    
    const consentKey = `legal_consent_accepted_${user.email}`;
    const legalConsent = localStorage.getItem(consentKey);
    
    // Only show if never accepted AND not already showing
    if (!legalConsent && !showLegalConsent) {
      const timer = setTimeout(() => setShowLegalConsent(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.email]);

  const isRootPage = ROOT_PAGES.includes(currentPageName);
  
  // Track navigation within tabs
  React.useEffect(() => {
    const activeTab = MOBILE_TAB_ITEMS.find(item => 
      item.page && location.pathname.startsWith(createPageUrl(item.page))
    );
    
    if (activeTab) {
      setTabHistory(prev => {
        const tabKey = activeTab.page;
        const currentStack = prev[tabKey] || [];
        const lastPath = currentStack[currentStack.length - 1];
        
        // Only add if it's a new path
        if (lastPath !== location.pathname) {
          return {
            ...prev,
            [tabKey]: [...currentStack, location.pathname]
          };
        }
        return prev;
      });
    }
  }, [location.pathname]);
  
  // Smart back button logic
  const handleBack = () => {
    const activeTab = MOBILE_TAB_ITEMS.find(item => 
      item.page && location.pathname.startsWith(createPageUrl(item.page))
    );
    
    if (activeTab) {
      const tabKey = activeTab.page;
      const currentStack = tabHistory[tabKey] || [];
      
      if (currentStack.length > 1) {
        // Go back within the tab's history
        const newStack = currentStack.slice(0, -1);
        setTabHistory(prev => ({ ...prev, [tabKey]: newStack }));
        navigate(newStack[newStack.length - 1]);
        return;
      }
    }
    
    // Fallback to browser back
    navigate(-1);
  };
  
  const canGoBack = !isRootPage && MOBILE_TAB_ITEMS.some(item => {
    if (!item.page) return false;
    const stack = tabHistory[item.page] || [];
    return location.pathname.startsWith(createPageUrl(item.page)) && stack.length > 1;
  });

  useEffect(() => {
  if (settings.length > 0 && !settings[0]?.onboarding_completed) {
    // Only show onboarding once per session
    const hasShownOnboarding = sessionStorage.getItem('onboarding_shown');
    if (!hasShownOnboarding) {
      setShowOnboarding(true);
      sessionStorage.setItem('onboarding_shown', '1');
    }
  }
  }, [settings]);

  useEffect(() => {
    const handleStartTour = () => setShowGuidedTour(true);
    const handleOnboardingComplete = (e) => {
      const interests = e.detail?.interests || [];
      setTourInterests(interests);
      // Auto-launch tour after short delay
      setTimeout(() => setShowGuidedTour(true), 800);
    };
    const handleOpenPlanner = (e) => {
      setPlanningPeriod(e.detail?.period || 'week');
      setShowPlanningAssistant(true);
    };

    window.addEventListener('start_guided_tour', handleStartTour);
    window.addEventListener('onboarding_complete', handleOnboardingComplete);
    window.addEventListener('open_planning_assistant', handleOpenPlanner);
    return () => {
      window.removeEventListener('start_guided_tour', handleStartTour);
      window.removeEventListener('onboarding_complete', handleOnboardingComplete);
      window.removeEventListener('open_planning_assistant', handleOpenPlanner);
    };
  }, []);

  // Emit first-access events when landing on key pages
  useEffect(() => {
    const pages = ['Islam', 'Wellness', 'Calendar', 'Dashboard'];
    if (!pages.includes(currentPageName)) return;
    const storageKey = `first_access_${currentPageName}`;
    if (!localStorage.getItem(storageKey)) {
      window.dispatchEvent(new CustomEvent('page_first_access', { detail: { page: currentPageName } }));
    }
  }, [currentPageName]);

    useEffect(() => {
      const handleKeyDown = (e) => {
        const tag = document.activeElement?.tagName;
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          setShowGlobalSearch(true);
        }
        // ? key to open shortcuts
        if (e.key === '?' && !isInput) {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
        // G + key navigation shortcuts
        if (e.key === 'g' && !isInput) {
          const handler = (e2) => {
            if (e2.key === 'h') window.location.href = '/Dashboard';
            if (e2.key === 'c') window.location.href = '/Calendar';
            if (e2.key === 'i') window.location.href = '/Islam';
            if (e2.key === 't') window.location.href = '/Goals';
            if (e2.key === 'n') window.location.href = '/Connect';
            window.removeEventListener('keydown', handler);
          };
          window.addEventListener('keydown', handler);
          setTimeout(() => window.removeEventListener('keydown', handler), 1500);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

  // ── Auth protection: redirect unauthenticated users to the marketing landing page.
  // Public pages (Landing, legal, contact) are rendered outside this Layout entirely
  // via App.jsx early-return logic, so this guard only fires for authenticated routes.
  useEffect(() => {
    const path = window.location.pathname;
    const publicPaths = ['/', '/Landing', '/PrivacyPolicy', '/TermsOfService', '/Contact'];
    // Never redirect from a public path or the Landing page component
    if (publicPaths.some(p => path === p || path.startsWith(p + '?')) || currentPageName === 'Landing') return;
    
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        // Send to marketing landing page, NOT /login
        window.location.href = '/';
      }
    }).catch(() => {
      // On error, still redirect to home rather than /login
      window.location.href = '/';
    });
  }, [currentPageName]);

  // ── Landing page: render without sidebar/nav (public marketing page)
  if (currentPageName === 'Landing') {
    return (
      <>
        <Toaster position="top-center" richColors />
        {children}
      </>
    );
  }

  return (
    <RealTimeNotificationProvider>
    <AISchedulingProvider>
      <FontLoader />
      <WelcomeEmailTrigger />
      {showSplash && <SplashScreen onDone={() => { sessionStorage.setItem('splash_shown', '1'); setShowSplash(false); }} />}
    <div className="min-h-screen bg-transparent dark:bg-transparent" style={{background: 'transparent'}}>
      <Toaster position={isMobile ? "bottom-center" : "top-center"} richColors />
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 flex-col z-[42] shadow-xl shadow-black/30" style={{background:'linear-gradient(180deg, #2D4A65 0%, #1B2A4A 30%, #0D4F6C 60%, #0A3333 100%)', borderRight:'2px solid rgba(41,171,226,0.35)'}}>
        {/* NSC gold+blue accent line at top */}
        <div className="h-[2px] w-full" style={{background:'linear-gradient(90deg, #E8B84B, #29ABE2, #1D6FB8)'}} />
        <div className="p-4 border-b border-nsc-steel/30" style={{borderColor:'rgba(122,158,181,0.3)'}}>
          <Link to="/dashboard" className="flex items-center gap-3 mb-3">
            <UserAvatar user={user} size="sm" />
            <div>
              <h1 className="font-black text-base tracking-tight" style={{color:'#E8B84B', textShadow:'0 1px 8px rgba(232,184,75,0.4)'}}>Vagus Planner</h1>
              <p className="text-xs tracking-widest font-medium uppercase" style={{color:'#A8C8E8', fontSize:'9px', letterSpacing:'0.15em'}}>Life · Faith · Balance</p>
            </div>
          </Link>
          <div className="h-px w-full mb-1" style={{background:'linear-gradient(90deg, transparent, rgba(232,184,75,0.5), transparent)'}} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <SmartNotificationCenter />
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="p-3 space-y-1.5" style={{borderBottom:'1px solid rgba(122,158,181,0.25)'}}>
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="w-full text-left px-3 py-2.5 rounded-lg transition-all group flex items-center gap-2"
            style={{background:'rgba(29,111,184,0.12)', border:'1px solid rgba(41,171,226,0.2)'}}
          >
            <Search className="w-4 h-4 group-hover:text-[#29ABE2]" style={{color:'rgba(168,200,232,0.8)'}} />
            <span className="text-sm font-medium flex-1" style={{color:'#D4E0EC'}}>Search everything…</span>
            <span className="text-[10px] font-mono" style={{color:'rgba(232,184,75,0.6)'}}>⌘K</span>
          </button>
          {!islamicEditionLoading && isIslamicEdition && (
            <button
              onClick={() => setShowHalalFinder(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-all group flex items-center gap-2"
              style={{background:'rgba(41,171,226,0.08)', border:'1px solid rgba(41,171,226,0.15)'}}
            >
              <Utensils className="w-4 h-4" style={{color:'#7BB8D4'}} />
              <span className="text-sm font-medium" style={{color:'#D4E0EC'}}>Halal Nearby</span>
            </button>
          )}
        </div>

        <nav className="p-3 space-y-0.5" data-tour="navigation">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            
            if (!item.page) return null;
            if (item.adminOnly && role !== 'admin') return null;
            if (item.islamicOnly && (islamicEditionLoading || !isIslamicEdition)) return null;
            
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative",
                  isActive ? "shadow-sm" : "border border-transparent"
                )}
                style={isActive ? {background:'rgba(29,111,184,0.2)', border:'1px solid rgba(41,171,226,0.45)'} : {}}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full" style={{background:'#E8B84B'}} />}
                <Icon className="w-4 h-4 flex-shrink-0 transition-colors pointer-events-none" style={{color: isActive ? '#29ABE2' : '#A8C8E8'}} />
                <span className={cn("text-sm truncate no-select select-none pointer-events-none", isActive ? "font-bold" : "font-medium")} style={{color: isActive ? '#ffffff' : '#D4E0EC'}}>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:'#E8B84B'}} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Smart Sidebar Tools */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <SidebarTools
            isIslamicEdition={isIslamicEdition}
            settings={settings[0] ?? userSettings}
            currentPageName={currentPageName}
            onOpenSearch={() => setShowGlobalSearch(true)}
            onOpenHalal={() => setShowHalalFinder(true)}
            onOpenPlanner={() => setShowPlanningAssistant(true)}
          />
        </div>

        {/* NSC gold+blue footer accent */}
        <div className="h-[2px] w-full" style={{background:'linear-gradient(90deg, #1D6FB8, #E8B84B, #29ABE2)'}} />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-[53] safe-area-top" style={{background:'linear-gradient(135deg, #2D4A65 0%, #1B2A4A 40%, #0D4F6C 80%, #0A3333 100%)', borderBottom:'2px solid rgba(41,171,226,0.45)', boxShadow:'0 4px 16px rgba(13,26,42,0.5), 0 2px 0 rgba(29,111,184,0.35)'}}>
        <div className="flex items-center justify-between px-3 sm:px-4 h-14 sm:h-16">
          {canGoBack ? (
            <button 
              onClick={handleBack}
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-lg hover:bg-white/10 transition-colors no-select min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{color:'#A8C8E8'}} />
            </button>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-1.5 sm:gap-2 no-select min-h-[40px]">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png" alt="Vagus Planner" className="w-full h-full object-cover" />
              </div>
              <span className="font-black text-sm sm:text-base tracking-tight" style={{color:'#E8B84B', textShadow:'0 1px 6px rgba(232,184,75,0.4)'}}>Vagus Planner</span>
            </Link>
          )}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors no-select min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            {!islamicEditionLoading && isIslamicEdition && (
              <button
                onClick={() => setShowHalalFinder(true)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors no-select min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Halal Nearby"
              >
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            )}
            <SmartNotificationCenter />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors no-select min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[53] pointer-events-auto"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed top-16 right-0 bottom-0 w-72 shadow-2xl z-[54] p-4 pointer-events-auto overflow-y-auto"
              style={{background:'linear-gradient(180deg, #2D4A65 0%, #1B2A4A 30%, #0D4F6C 65%, #0A3333 100%)', borderLeft:'2px solid rgba(41,171,226,0.35)'}}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5 mb-2">
                {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;

                if (!item.page) return null;
                if (item.adminOnly && role !== 'admin') return null;
                if (item.islamicOnly && (islamicEditionLoading || !isIslamicEdition)) return null;

                return (
                  <Link
                    key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all border"
                      style={isActive ? {background:'rgba(29,111,184,0.25)', borderColor:'rgba(41,171,226,0.5)'} : {borderColor:'transparent'}}
                    >
                      <Icon className="w-5 h-5 pointer-events-none" style={{color: isActive ? '#E8B84B' : '#A8C8E8'}} />
                      <span className="font-semibold no-select select-none pointer-events-none" style={{color: isActive ? '#ffffff' : '#D4E0EC'}}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Smart Tools in mobile menu */}
              <SidebarTools
                isIslamicEdition={isIslamicEdition}
                settings={settings[0] ?? userSettings}
                currentPageName={currentPageName}
                onOpenSearch={() => { setShowGlobalSearch(true); setMobileMenuOpen(false); }}
                onOpenHalal={() => { setShowHalalFinder(true); setMobileMenuOpen(false); }}
                onOpenPlanner={() => { setShowPlanningAssistant(true); setMobileMenuOpen(false); }}
              />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[52]">
        <nav style={{background:'linear-gradient(135deg, #2D4A65 0%, #1B2A4A 35%, #0D4F6C 70%, #0A3333 100%)', borderTop:'2px solid rgba(41,171,226,0.4)', paddingBottom:'env(safe-area-inset-bottom)', boxShadow:'0 -1px 0 rgba(29,111,184,0.35), 0 -4px 24px rgba(13,26,42,0.5)'}} data-tour="navigation">
          <div className="flex items-center justify-around" style={{ height: '3.5rem', minHeight: '56px' }}>
            {MOBILE_TAB_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;

            return (
              <Link
                key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      const rootPath = createPageUrl(item.page);
                      setTabHistory(prev => ({ ...prev, [item.page]: [rootPath] }));
                      navigate(rootPath, { replace: true });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all duration-150 flex-1 relative no-select touch-feedback min-h-[56px] active:scale-95"
                >
                  <Icon className="w-5 h-5 transition-all pointer-events-none" style={{color: isActive ? '#E8B84B' : '#A8C8E8', transform: isActive ? 'scale(1.1)' : 'scale(1)'}} />
                  <span className="text-[9px] sm:text-[10px] no-select select-none leading-tight truncate max-w-full font-semibold pointer-events-none" style={{color: isActive ? '#E8B84B' : '#A8C8E8'}}>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                      style={{background:'#E8B84B'}}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>



      {/* Main Content */}
      <main 
          className="lg:ml-56 pt-14 sm:pt-16 lg:pt-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 min-h-screen overflow-x-hidden overflow-y-auto overscroll-none hide-scrollbar"
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
          style={{ background: 'transparent', backdropFilter: 'none' }}
        >
          <PullToRefresh onRefresh={async () => {
            await queryClient.invalidateQueries();
            await new Promise(resolve => setTimeout(resolve, 500));
          }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, x: isMobile ? 24 : 0, y: isMobile ? 0 : 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: isMobile ? -24 : 0, y: isMobile ? 0 : -8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="px-3 sm:px-4 py-4 lg:p-6 pb-8 lg:pb-6 w-full max-w-full box-border"
              >
                <Breadcrumbs />
                {children}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </main>

      {/* Offline Sync — always mounted */}
      <EnhancedOfflineSync />
      <ServiceWorkerManager />
      <CapacitorPushRegistration />

      {/* Lazy non-critical components */}
      <React.Suspense fallback={null}>
        {showPlanningAssistant && (
          <AIPlanningAssistant 
            isOpen={showPlanningAssistant} 
            onClose={() => setShowPlanningAssistant(false)}
            period={planningPeriod}
          />
        )}
        {showGlobalSearch && <GlobalSearch isOpen={showGlobalSearch} onOpenChange={setShowGlobalSearch} />}
        <KeyboardShortcutsModal isOpen={showKeyboardShortcuts} onClose={() => setShowKeyboardShortcuts(false)} />
        {showHelpCenter && <HelpCenter isOpen={showHelpCenter} onClose={() => setShowHelpCenter(false)} />}
        {showHalalFinder && <HalalRestaurantFinder isOpen={showHalalFinder} onClose={() => setShowHalalFinder(false)} />}
        <UnifiedFAB />
        {islamicMode && <ArabicKeyboardHelper />}
      </React.Suspense>
    </div>
    </AISchedulingProvider>
    </RealTimeNotificationProvider>
  );
}