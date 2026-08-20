import { ArrowLeft, User } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { DevicePageLayout } from '../components/layout/DevicePageLayout'
import { getDeviceById } from '../data/mockDevices'

export function DeviceDetailPage() {
  const { deviceId } = useParams()
  const device = deviceId ? getDeviceById(deviceId) : undefined

  if (!device) {
    return <Navigate to="/devices" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2">
        <Link
          to="/devices"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to device list
        </Link>
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
        >
          <User className="h-4 w-4" />
          Profile
        </Link>
      </div>
      <DevicePageLayout device={device} />
    </div>
  )
}
