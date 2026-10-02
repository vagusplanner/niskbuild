import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthGuard from './components/AuthGuard';
import { LanguageProvider } from '@/lib/LanguageContext';
import FloatingAssistant from './components/FloatingAssistant';
// Add page imports here
import Hybrid from './pages/Hybrid';
import Bespoke from './pages/Bespoke';
import BookDiscovery from './pages/BookDiscovery';
import Landing from './pages/Landing';
import BookSession from './pages/BookSession';
import AICoach from './pages/AICoach';
import Dashboard from './pages/Dashboard';
import MyBookings from './pages/MyBookings';
import Resources from './pages/Resources';
import Legal from './pages/Legal';
import GoalTracker from './pages/GoalTracker';
import PerformanceInsights from './pages/PerformanceInsights';
import Onboarding from './pages/Onboarding';
import Blog from './pages/Blog';
import CaseStudies from './pages/CaseStudies.jsx';
import Insights from './pages/Insights';
import CookieBanner from './components/CookieBanner.jsx';
import SEOAudit from './pages/SEOAudit';
import ClientPortal from './pages/ClientPortal';
import LearningPaths from './pages/LearningPaths';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Don't redirect automatically — let public pages render.
      // Protected pages handle their own auth guard.
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/blog" element={<Insights />} />
      <Route path="/case-studies" element={<Insights />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/discovery" element={<BookDiscovery />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protected routes — require sign in */}
      <Route path="/book" element={<AuthGuard><BookSession /></AuthGuard>} />
      <Route path="/ai-coach" element={<AuthGuard><AICoach /></AuthGuard>} />
      <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/resources" element={<AuthGuard><Resources /></AuthGuard>} />
      <Route path="/my-bookings" element={<AuthGuard><MyBookings /></AuthGuard>} />
      <Route path="/bookings" element={<AuthGuard><MyBookings /></AuthGuard>} />
      <Route path="/goals" element={<AuthGuard><GoalTracker /></AuthGuard>} />
      {/* Public blog/insights occupies /insights; performance UI lives here */}
      <Route path="/performance-insights" element={<AuthGuard><PerformanceInsights /></AuthGuard>} />
      <Route path="/hybrid" element={<AuthGuard><Hybrid /></AuthGuard>} />
      <Route path="/learning" element={<AuthGuard><LearningPaths /></AuthGuard>} />
      <Route path="/bespoke" element={<AuthGuard><Bespoke /></AuthGuard>} />

      <Route path="/portal" element={<ClientPortal />} />
      <Route path="/seo-audit" element={<SEOAudit />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
            <FloatingAssistant />
          </Router>
          <Toaster />
          <CookieBanner />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App