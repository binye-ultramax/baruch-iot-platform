import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/auth/AdminRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { PlatformProvider } from './context/PlatformContext'
import { AdminPage } from './pages/AdminPage'
import { DeviceDetailPage } from './pages/DeviceDetailPage'
import { DeviceListPage } from './pages/DeviceListPage'
import { FleetManagePage } from './pages/FleetManagePage'
import { LoginPage } from './pages/LoginPage'
import { UserProfilePage } from './pages/UserProfilePage'

function App() {
  return (
    <AuthProvider>
      <PlatformProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/devices" element={<DeviceListPage />} />
              <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/manage" element={<FleetManagePage />} />

              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/devices" replace />} />
            <Route path="*" element={<Navigate to="/devices" replace />} />
          </Routes>
        </BrowserRouter>
      </PlatformProvider>
    </AuthProvider>
  )
}

export default App
