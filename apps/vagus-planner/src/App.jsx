
import Login from './pages/Login';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  const path = window.location.pathname;
  const isLandingPath = path === '/' || path === '/Landing' || path === '';
  const isPublicLegalPath = path === '/PrivacyPolicy' || path === '/TermsOfService' || path === '/Contact';
  const isLoginPath = path === '/login';

  if (isLoginPath) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  // Always render landing page without any auth check — Landing itself handles the redirect for logged-in users
  if (isLandingPath) {
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
        <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
        <Route path="/TermsOfService" element={<TermsOfService />} />
        <Route path="/Contact" element={<Contact />} />
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

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    if (authError.type === 'auth_required') {
      return <Navigate to={`/login?next=${encodeURIComponent(path)}`} replace />;
    }
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(path)}`} replace />;
  }

  // Render the main app (protected routes)
  return (
    <Routes>
      {/* Public Landing Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/Landing" element={<Landing />} />

      {/* Dashboard as /dashboard for logged-in users */}
      <Route
        path="/dashboard"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />
      {Object.entries(Pages).map(([p, Page]) => (
        <Route
          key={p}
          path={`/${p}`}
          element={
            <LayoutWrapper currentPageName={p}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Goals" element={<LayoutWrapper currentPageName="Goals"><Goals /></LayoutWrapper>} />
      <Route path="/Notifications" element={<LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper>} />
      <Route path="/ZakatCalculator" element={<LayoutWrapper currentPageName="ZakatCalculator"><IslamicEditionGate page><ZakatCalculator /></IslamicEditionGate></LayoutWrapper>} />
      <Route path="/HajjUmrahDashboard" element={<LayoutWrapper currentPageName="HajjUmrahDashboard"><IslamicEditionGate page><HajjUmrahDashboard /></IslamicEditionGate></LayoutWrapper>} />
      <Route path="/Finance" element={<LayoutWrapper currentPageName="Finance"><Finance /></LayoutWrapper>} />
      <Route path="/MosqueCommunityCalendar" element={<LayoutWrapper currentPageName="MosqueCommunityCalendar"><MosqueCommunityCalendar /></LayoutWrapper>} />
      <Route path="/ZakatDonation" element={<LayoutWrapper currentPageName="ZakatDonation"><ZakatDonation /></LayoutWrapper>} />
      <Route path="/MosqueMap" element={<LayoutWrapper currentPageName="MosqueMap"><MosqueMap /></LayoutWrapper>} />
      <Route path="/FamilyHub" element={<LayoutWrapper currentPageName="FamilyHub"><FamilyHub /></LayoutWrapper>} />
      <Route path="/Account" element={<LayoutWrapper currentPageName="Account"><Account /></LayoutWrapper>} />
      <Route path="/ActivityFeed" element={<LayoutWrapper currentPageName="ActivityFeed"><ActivityFeedPage /></LayoutWrapper>} />
      <Route path="/VoiceJournal" element={<LayoutWrapper currentPageName="VoiceJournal"><VoiceJournalPage /></LayoutWrapper>} />
      <Route path="/AIGoalPlanner" element={<LayoutWrapper currentPageName="AIGoalPlanner"><AIGoalPlannerPage /></LayoutWrapper>} />
      <Route path="/NotificationSettings" element={<LayoutWrapper currentPageName="NotificationSettings"><NotificationSettings /></LayoutWrapper>} />
      <Route path="/ZakatDashboard" element={<LayoutWrapper currentPageName="ZakatDashboard"><ZakatDashboard /></LayoutWrapper>} />
      <Route path="/FamilyDashboard" element={<LayoutWrapper currentPageName="FamilyDashboard"><FamilyDashboardPage /></LayoutWrapper>} />
      <Route path="/DailyPlanner" element={<LayoutWrapper currentPageName="DailyPlanner"><DailyPlanner /></LayoutWrapper>} />
      <Route path="/WhatsAppImport" element={<LayoutWrapper currentPageName="WhatsAppImport"><WhatsAppImport /></LayoutWrapper>} />
      <Route path="/FamilyBudget" element={<LayoutWrapper currentPageName="FamilyBudget"><FamilyBudget /></LayoutWrapper>} />
      <Route path="/VoiceErrands" element={<LayoutWrapper currentPageName="VoiceErrands"><VoiceErrands /></LayoutWrapper>} />
      <Route path="/ItineraryAssistant" element={<LayoutWrapper currentPageName="ItineraryAssistant"><ItineraryAssistant /></LayoutWrapper>} />
      <Route path="/CaptureHub" element={<LayoutWrapper currentPageName="CaptureHub"><CaptureHub /></LayoutWrapper>} />
      <Route path="/TeamWorkspace" element={<LayoutWrapper currentPageName="TeamWorkspace"><TeamWorkspacePage /></LayoutWrapper>} />
      <Route path="/MealPlanner" element={<LayoutWrapper currentPageName="MealPlanner"><MealPlannerPage /></LayoutWrapper>} />
      <Route path="/TravelPackingAssistant" element={<LayoutWrapper currentPageName="TravelPackingAssistant"><TravelPackingAssistantPage /></LayoutWrapper>} />
      <Route path="/HadithLearning" element={<LayoutWrapper currentPageName="HadithLearning"><HadithLearningPage /></LayoutWrapper>} />
      <Route path="/FitnessGoalDashboard" element={<LayoutWrapper currentPageName="FitnessGoalDashboard"><FitnessGoalDashboard /></LayoutWrapper>} />
      {/* Public legal & contact pages — no auth required, no layout wrapper */}
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/TermsOfService" element={<TermsOfService />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
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
