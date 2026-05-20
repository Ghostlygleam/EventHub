import { type ReactNode, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { isTokenExpired } from './lib/token'

import LoginPage from './pages/LoginPage'
import VerifyPage from './pages/VerifyPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import DashboardPage from './pages/DashboardPage'
import OrganiserListPage from './pages/organiser/OrganiserListPage'
import OrganiserEventFormPage from './pages/organiser/OrganiserEventFormPage'
import OrganiserEventDetailPage from './pages/organiser/OrganiserEventDetailPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminLogsPage from './pages/admin/AdminLogsPage'
import NotFoundPage from './pages/NotFoundPage'

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
      <Route path="/admin/logs" element={<ProtectedRoute><AdminLogsPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}