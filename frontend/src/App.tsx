import { type ReactNode, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { isTokenExpired } from './lib/token'

import LoginPage from './pages/LoginPage'
import VerifyPage from './pages/VerifyPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import DashboardPage from './pages/DashboardPage'
import OrganiserPage from './pages/OrganiserPage'
import AdminPage from './pages/AdminPage'
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
      <Route path="/organiser/*" element={<ProtectedRoute><OrganiserPage /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
