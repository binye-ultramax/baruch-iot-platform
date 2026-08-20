import { AlertTriangle, Router, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlatform, getUserLastLogin } from '../../context/PlatformContext'
import { devices, type DeviceData, type DeviceStatus } from '../../data/mockDevices'
import { mockUsers } from '../../data/mockUsers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const statusStyles: Record<DeviceStatus, string> = {
  online: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  offline: 'bg-gray-100 text-gray-600',
}

function isAttentionDevice(device: DeviceData, lowSocThreshold: number) {
  return device.status !== 'online' || device.soc <= lowSocThreshold
}

export function AdminOverview() {
  const { settings, activities, deviceOps, userRoles, getManagedDevices } = usePlatform()

  const onlineCount = devices.filter((device) => device.status === 'online').length
  const warningCount = devices.filter((device) => device.status === 'warning').length
  const offlineCount = devices.filter((device) => device.status === 'offline').length
  const lowSocCount = devices.filter((device) => device.soc <= settings.lowSocThreshold).length
  const lockedDownCount = Object.values(deviceOps).filter((ops) => ops.lockedDown).length

  const attentionDevices = devices
    .filter((device) => isAttentionDevice(device, settings.lowSocThreshold))
    .slice(0, 6)

  const fleetGroups = Array.from(new Set(devices.map((device) => device.group))).map((group) => ({
    group,
    count: devices.filter((device) => device.group === group).length,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Router className="h-4 w-4" />
            Total devices
          </div>
          <p className="text-3xl font-semibold text-gray-900">{devices.length}</p>
        </Card>
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            Platform users
          </div>
          <p className="text-3xl font-semibold text-gray-900">{mockUsers.length}</p>
        </Card>
        <Card>
          <div className="mb-2 text-sm text-gray-500">Platform fleet health</div>
          <p className="text-sm font-medium text-gray-900">
            {onlineCount} online · {warningCount} warning · {offlineCount} offline
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {lowSocCount} below {settings.lowSocThreshold}% SOC · {lockedDownCount} locked down
          </p>
        </Card>
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            Platform alerts
          </div>
          <p className="text-3xl font-semibold text-gray-900">{attentionDevices.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User accounts overview</h2>
            <p className="mt-1 text-sm text-gray-500">
              Platform-wide view of all users and their managed fleets.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Managed devices</th>
                  <th className="pb-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user) => {
                  const managed = getManagedDevices(user.email)
                  return (
                    <tr key={user.email} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="muted">{userRoles[user.email] ?? user.role}</Badge>
                      </td>
                      <td className="py-3 pr-4">{managed.length}</td>
                      <td className="py-3 text-gray-600">{getUserLastLogin(user.email)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Fleet distribution</h2>
          <div className="space-y-3">
            {fleetGroups.map(({ group, count }) => (
              <div
                key={group}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
              >
                <span className="text-sm text-gray-700">{group}</span>
                <Badge variant="muted">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Platform devices requiring attention</h2>
            <p className="mt-1 text-sm text-gray-500">Read-only oversight across all users and fleets.</p>
          </div>
          <Badge variant="muted">{attentionDevices.length} devices</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 font-medium">Device</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">SOC</th>
                <th className="pb-3 pr-4 font-medium">Reason</th>
                <th className="pb-3 font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {attentionDevices.map((device) => {
                const ops = deviceOps[device.id]
                const reasons = [
                  device.status !== 'online' ? device.status : null,
                  device.soc <= settings.lowSocThreshold ? 'Low SOC' : null,
                  ops?.lockedDown ? 'Locked down' : null,
                ].filter(Boolean)

                return (
                  <tr key={device.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.model}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[device.status]}`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{device.soc}%</td>
                    <td className="py-3 pr-4 text-gray-600">{reasons.join(' · ') || 'Monitor'}</td>
                    <td className="py-3">
                      <Link to={`/devices/${device.id}`} className="text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Platform activity</h2>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-1 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {activity.action} · {activity.target}
                </p>
                <p className="text-xs text-gray-500">{activity.actor}</p>
              </div>
              <p className="text-xs text-gray-400">{activity.timestamp}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
