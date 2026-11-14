import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApp } from './store/AppStore'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { AgentPage } from './pages/AgentPage'
import { SchoolsPage } from './pages/SchoolsPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { AppointmentDetailPage } from './pages/AppointmentDetailPage'
import { CalendarPage } from './pages/CalendarPage'
import { FollowUpsPage } from './pages/FollowUpsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { InviteResponsePage } from './pages/InviteResponsePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  const { user, isAdmin } = useApp()
  const location = useLocation()

  useEffect(() => {
    document.title = 'Eduvian · AI Sales & Appointment Agent'
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/invite/:token" element={<InviteResponsePage />} />

      <Route element={user ? <AppShell /> : <Navigate to="/login" replace />}>
        <Route index element={<Overview />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route
          path="/approvals"
          element={isAdmin ? <ApprovalsPage /> : <Navigate to="/" replace />}
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
