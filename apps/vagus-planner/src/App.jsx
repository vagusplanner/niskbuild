
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useLocation, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { usesHashRouter } from '@/lib/static-bundle';
import { isIosNativeApp, isNativeCapacitorApp } from '@/lib/vp-platform';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Goals from './pages/Goals';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import Landing from './pages/Landing';
import Notifications from './pages/Notifications';
import ZakatCalculator from './pages/ZakatCalculator';
import HajjUmrahDashboard from './pages/HajjUmrahDashboard';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import Finance from './pages/Finance';
import MosqueCommunityCalendar from './pages/MosqueCommunityCalendar';
import ZakatDonation from './pages/ZakatDonation';
import MosqueMap from './pages/MosqueMap';
import FamilyHub from './pages/FamilyHub';
import Account from './pages/Account';
import ActivityFeedPage from './pages/ActivityFeed';
import VoiceJournalPage from './pages/VoiceJournal';
import AIGoalPlannerPage from './pages/AIGoalPlanner';
import NotificationSettings from './pages/NotificationSettings';
import ZakatDashboard from './pages/ZakatDashboard';
import FamilyDashboardPage from './pages/FamilyDashboard';
import DailyPlanner from './pages/DailyPlanner';
import WhatsAppImport from './pages/WhatsAppImport';
import FamilyBudget from './pages/FamilyBudget';
import VoiceErrands from './pages/VoiceErrands';
import ItineraryAssistant from './pages/ItineraryAssistant';
import CaptureHub from './pages/CaptureHub';
import TeamWorkspacePage from './pages/TeamWorkspace';
import MealPlannerPage from './pages/MealPlanner';
import TravelPackingAssistantPage from './pages/TravelPackingAssistant';
import HadithLearningPage from './pages/HadithLearning';
import FitnessGoalDashboard from './pages/FitnessGoalDashboard';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

/** Pages that must not mount the authenticated app chrome. */
const NO_APP_LAYOUT = new Set(['Landing', 'PrivacyPolicy', 'TermsOfService', 'Support', 'Contact']);

/** Derive Layout currentPageName from the URL (stable across Outlet child swaps). */
function pageNameFromPath(pathname) {
  const seg = (pathname || '/').replace(/^\//, '').split('/')[0] || '';
  if (!seg || seg.toLowerCase() === 'dashboard') return 'Dashboard';
  return seg;
}

/**
 * Single persistent Layout shell — child routes render via <Outlet />.
 * Prevents remounting Layout (and resetting edition/modal state) on every tab change.
 */
function AppLayoutShell() {
  const location = useLocation();
  const currentPageName = pageNameFromPath(location.pathname);
  if (!Layout) return <Outlet />;
  return (
    <Layout currentPageName={currentPageName}>
      <Outlet />
    </Layout>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const isBuilderPreview = searchParams.has('builder');
  const isLandingPath = path === '/' || path === '/Landing' || path === '';
  const isPublicLegalPath =
    path === '/PrivacyPolicy' ||
    path === '/privacy' ||
    path === '/TermsOfService' ||
    path === '/terms' ||
    path === '/Contact' ||
    path === '/support' ||
    path === '/Support';
  const isLoginPath = path === '/login';
  const isSignupPath = path === '/signup';
  const isResetPasswordPath =
    path === '/reset-password' || path === '/ResetPassword';
  const nativeShell = isNativeCapacitorApp() || isIosNativeApp();

  if (isLoginPath || isSignupPath || isResetPasswordPath) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/ResetPassword" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (isLandingPath && isBuilderPreview) {
    return <Navigate to={`/Dashboard${location.search}`} replace />;
  }

  // Native app: never show marketing Landing — splash → login/signup → Dashboard.
  if (isLandingPath && nativeShell) {
    if (isLoadingPublicSettings || isLoadingAuth) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#060f1e]">
          <div className="w-8 h-8 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full animate-spin"></div>
        </div>
      );
    }
    if (isAuthenticated) {
      return <Navigate to="/Dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Always render landing page without any auth check — Landing itself handles the redirect for logged-in users
  if (isLandingPath && !isBuilderPreview) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/Landing" element={<Landing />} />
      </Routes>
    );
  }

  if (isPublicLegalPath) {
    return (
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/TermsOfService" element={<TermsOfService />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/support" element={<Contact />} />
        <Route path="/Support" element={<Navigate to="/support" replace />} />
      </Routes>
    );
  }

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060f1e]">
        <div className="w-8 h-8 border-4 border-[#E8B84B]/30 border-t-[#E8B84B] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (builder studio preview skips login gate)
  if (authError && !isBuilderPreview) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required') {
      // Native / HashRouter: never dump users on marketing Landing.
      return <Navigate to={`/login?next=${encodeURIComponent(path)}`} replace />;
    }
  }

  // Redirect unauthenticated users (builder studio preview skips auth)
  if (!isAuthenticated && !isBuilderPreview) {
    return <Navigate to={`/login?next=${encodeURIComponent(path)}`} replace />;
  }

  // Protected app — one Layout instance for all chrome routes (Outlet children swap).
  return (
    <Routes>
      {/* Native: `/` already redirected above; keep Landing routes for web only. */}
      {!nativeShell && <Route path="/" element={<Landing />} />}
      {!nativeShell && <Route path="/Landing" element={<Landing />} />}
      {nativeShell && <Route path="/" element={<Navigate to="/Dashboard" replace />} />}
      {nativeShell && <Route path="/Landing" element={<Navigate to="/Dashboard" replace />} />}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/TermsOfService" element={<TermsOfService />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/support" element={<Contact />} />
      <Route path="/Support" element={<Navigate to="/support" replace />} />

      <Route element={<AppLayoutShell />}>
        <Route path="/dashboard" element={<MainPage />} />
        {Object.entries(Pages)
          .filter(([p]) => !NO_APP_LAYOUT.has(p))
          .map(([p, Page]) => (
            <Route key={p} path={`/${p}`} element={<Page />} />
          ))}
        <Route path="/Goals" element={<Goals />} />
        <Route path="/Notifications" element={<Notifications />} />
        <Route path="/ZakatCalculator" element={<IslamicEditionGate page><ZakatCalculator /></IslamicEditionGate>} />
        <Route path="/HajjUmrahDashboard" element={<IslamicEditionGate page><HajjUmrahDashboard /></IslamicEditionGate>} />
        <Route path="/Finance" element={<Finance />} />
        <Route path="/MosqueCommunityCalendar" element={<MosqueCommunityCalendar />} />
        <Route path="/ZakatDonation" element={<ZakatDonation />} />
        <Route path="/MosqueMap" element={<MosqueMap />} />
        <Route path="/FamilyHub" element={<FamilyHub />} />
        <Route path="/Account" element={<Account />} />
        <Route path="/ActivityFeed" element={<ActivityFeedPage />} />
        <Route path="/VoiceJournal" element={<VoiceJournalPage />} />
        <Route path="/AIGoalPlanner" element={<AIGoalPlannerPage />} />
        <Route path="/NotificationSettings" element={<NotificationSettings />} />
        <Route path="/ZakatDashboard" element={<ZakatDashboard />} />
        <Route path="/FamilyDashboard" element={<FamilyDashboardPage />} />
        <Route path="/DailyPlanner" element={<DailyPlanner />} />
        <Route path="/WhatsAppImport" element={<WhatsAppImport />} />
        <Route path="/FamilyBudget" element={<FamilyBudget />} />
        <Route path="/VoiceErrands" element={<VoiceErrands />} />
        <Route path="/ItineraryAssistant" element={<ItineraryAssistant />} />
        <Route path="/CaptureHub" element={<CaptureHub />} />
        <Route path="/TeamWorkspace" element={<TeamWorkspacePage />} />
        <Route path="/MealPlanner" element={<MealPlannerPage />} />
        <Route path="/TravelPackingAssistant" element={<TravelPackingAssistantPage />} />
        <Route path="/HadithLearning" element={<HadithLearningPage />} />
        <Route path="/FitnessGoalDashboard" element={<FitnessGoalDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const Router = usesHashRouter() ? HashRouter : BrowserRouter;

  return (
    <QueryClientProvider client={queryClientInstance}>
      <OnboardingGate>
        <AuthProvider>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </AuthProvider>
      </OnboardingGate>
    </QueryClientProvider>
  )
}

export default App
