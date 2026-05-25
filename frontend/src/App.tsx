import { type ReactNode, lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { isTokenExpired } from './lib/token'

import LoginPage from './pages/LoginPage'
import VerifyPage from './pages/VerifyPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'

/* Code-split: organiser and admin areas are gated by role, so students never
   need this code. Lazy chunks keep the initial bundle slim. */
const OrganiserListPage         = lazy(() => import('./pages/organiser/OrganiserListPage'))
const OrganiserEventFormPage    = lazy(() => import('./pages/organiser/OrganiserEventFormPage'))
const OrganiserEventDetailPage  = lazy(() => import('./pages/organiser/OrganiserEventDetailPage'))
const AdminUsersPage            = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminClubsPage            = lazy(() => import('./pages/admin/AdminClubsPage'))
const AdminLogsPage             = lazy(() => import('./pages/admin/AdminLogsPage'))

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        color: 'hsl(0, 0%, 60%)',
        fontFamily: "'DM Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
      aria-live="polite"
    >
      Loading…
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth()

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      logout()
    }
  }, [token, logout])

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/verify" element={<VerifyPage />} />

        <Route path="/" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/organiser" element={<ProtectedRoute><OrganiserListPage /></ProtectedRoute>} />
        <Route path="/organiser/events/new" element={<ProtectedRoute><OrganiserEventFormPage /></ProtectedRoute>} />
        <Route path="/organiser/events/:id" element={<ProtectedRoute><OrganiserEventDetailPage /></ProtectedRoute>} />
        <Route path="/organiser/events/:id/edit" element={<ProtectedRoute><OrganiserEventFormPage /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/clubs" element={<ProtectedRoute><AdminClubsPage /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute><AdminLogsPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}