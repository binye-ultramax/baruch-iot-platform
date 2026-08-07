import { ArrowLeft, Bell, Mail, Phone, Shield, User } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { DetailRow } from '../components/ui/Accordion'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'
import { useAuth } from '../context/AuthContext'
import { getInitials, getUserProfile } from '../data/mockUsers'

export function UserProfilePage() {
  const { user } = useAuth()
  const profile = user ? getUserProfile(user.email) : null

  const [notifications, setNotifications] = useState(
    profile?.notifications ?? {
      emailAlerts: true,
      smsAlerts: false,
      weeklyReports: true,
      deviceOffline: true,
    },
  )

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  function updateNotification(key: keyof typeof notifications, value: boolean) {
    setNotifications((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <Link
          to="/devices"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to device list
        </Link>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Card>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white">
              {getInitials(user.name)}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">{user.name}</h1>
                <Badge variant="muted">{user.role}</Badge>
              </div>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="mt-1 text-sm text-gray-500">{profile.department}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:text-right">
              <div>
                <p className="text-xs text-gray-500">Managed devices</p>
                <p className="text-lg font-semibold text-gray-900">{profile.managedDevices}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last login</p>
                <p className="text-sm font-medium text-gray-900">{profile.lastLogin}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Account details</h2>
            </div>
            <div className="space-y-3">
              <DetailRow label="Full name" value={user.name} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="Department" value={profile.department} />
              <DetailRow label="Phone" value={profile.phone} />
              <DetailRow label="Timezone" value={profile.timezone} />
              <DetailRow label="Member since" value={profile.joinedDate} />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Notification preferences</h2>
            </div>
            <div className="space-y-4">
              <ToggleSwitch
                label="Email alerts for critical events"
                checked={notifications.emailAlerts}
                onChange={(value) => updateNotification('emailAlerts', value)}
              />
              <ToggleSwitch
                label="SMS alerts for offline devices"
                checked={notifications.smsAlerts}
                onChange={(value) => updateNotification('smsAlerts', value)}
              />
              <ToggleSwitch
                label="Weekly fleet summary reports"
                checked={notifications.weeklyReports}
                onChange={(value) => updateNotification('weeklyReports', value)}
              />
              <ToggleSwitch
                label="Notify when a device goes offline"
                checked={notifications.deviceOffline}
                onChange={(value) => updateNotification('deviceOffline', value)}
              />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Mail className="h-4 w-4 text-gray-400" />
                  Login email
                </div>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Recovery phone
                </div>
                <p className="text-sm text-gray-600">{profile.phone}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Password changes and two-factor authentication are not available in this mock
              environment.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
