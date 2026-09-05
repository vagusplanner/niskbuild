import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth, RequireOnboarded } from '@/auth/guards'
import LoginPage from '@/pages/Login'
import SignupPage from '@/pages/Signup'
import OnboardingPage from '@/pages/Onboarding'
import DashboardPage from '@/pages/Dashboard'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireOnboarded />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
