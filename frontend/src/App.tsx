import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import LoginPage from "./pages/LoginPage";
import VerifyPage from "./pages/VerifyPage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import DashboardPage from "./pages/DashboardPage";
import OrganiserPage from "./pages/OrganiserPage";
import AdminPage from "./pages/AdminPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/verify" element={<VerifyPage />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
      <Route path="/me" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/organiser/*" element={<ProtectedRoute><OrganiserPage /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
    </Routes>
  );
}
