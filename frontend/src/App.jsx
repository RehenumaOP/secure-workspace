import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WorkspaceHomePage from './pages/WorkspaceHomePage'
import WorkspaceDetailPage from './pages/WorkspaceDetailPage'
import MyTasksPage from './pages/MyTasksPage'
import CalendarPage from './pages/CalendarPage'
import SettingsPage from './pages/SettingsPage'
import SecurityPage from './pages/SecurityPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: 12, fontSize: 13 }
        }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected — all wrapped in Layout (sidebar) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default → home dashboard */}
            <Route index element={<Navigate to="/workspaces" replace />} />

            {/* Workspace routes */}
            <Route path="workspaces" element={<WorkspaceHomePage />} />
            <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />

            {/* Sidebar nav routes */}
            <Route path="my-tasks" element={<MyTasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="security" element={<SecurityPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/workspaces" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App