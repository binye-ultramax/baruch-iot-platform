import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdministrator } from '../../data/mockUsers'

export function AdminRoute() {
  const { user } = useAuth()

  if (!isAdministrator(user)) {
    return <Navigate to="/devices" replace />
  }

  return <Outlet />
}
