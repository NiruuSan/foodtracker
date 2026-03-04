import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { I18nContext, getTranslator } from '@/i18n'
import type { Locale } from '@/i18n'
import Layout from '@/components/Layout'
import AuthPage from '@/pages/AuthPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DashboardPage from '@/pages/DashboardPage'
import MealsPage from '@/pages/MealsPage'
import ExercisePage from '@/pages/ExercisePage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import ProfilePage from '@/pages/ProfilePage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/onboarding"
        element={
          !user ? <Navigate to="/auth" replace /> :
          profile?.onboarding_completed ? <Navigate to="/" replace /> :
          <OnboardingPage />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/exercise" element={<ExercisePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function getInitialLocale(): Locale {
  const saved = localStorage.getItem('fittrack-lang')
  if (saved === 'fr' || saved === 'en') return saved
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('fr')) return 'fr'
  return 'en'
}

export default function App() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('fittrack-lang', l)
    document.documentElement.lang = l
  }, [])

  const t = getTranslator(locale)

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '14px',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </I18nContext.Provider>
  )
}
