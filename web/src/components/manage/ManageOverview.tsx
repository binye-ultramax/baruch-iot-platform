import { AlertTriangle, Router } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlatform } from '../../context/PlatformContext'
import { type DeviceData, type DeviceStatus } from '../../data/mockDevices'
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

export function ManageOverview() {
  const { user } = useAuth()
  const { settings, activities, deviceOps, getManagedDevices } = usePlatform()

  if (!user) return null

  const myDevices = getManagedDevices(user.email)
  const onlineCount = myDevices.filter((device) => device.status === 'online').length
  const warningCount = myDevices.filter((device) => device.status === 'warning').length
  const offlineCount = myDevices.filter((device) => device.status === 'offline').length
  const connectedCount = myDevices.filter((device) => deviceOps[device.id]?.connected).length
  const lockedDownCount = myDevices.filter((device) => deviceOps[device.id]?.lockedDown).length

  const attentionDevices = myDevices
    .filter((device) => isAttentionDevice(device, settings.lowSocThreshold))
    .slice(0, 6)

  const myActivities = activities.filter((activity) => activity.actor === user.name).slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Router className="h-4 w-4" />
            My devices
          </div>
          <p className="text-3xl font-semibold text-gray-900">{myDevices.length}</p>
        </Card>
        <Card>
          <div className="mb-2 text-sm text-gray-500">Fleet health</div>
          <p className="text-sm font-medium text-gray-900">
            {onlineCount} online · {warningCount} warning · {offlineCount} offline
          </p>
        </Card>
        <Card>
          <div className="mb-2 text-sm text-gray-500">Active connections</div>
          <p className="text-3xl font-semibold text-gray-900">{connectedCount}</p>
          <p className="mt-1 text-xs text-gray-500">{lockedDownCount} locked down</p>
        </Card>
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            Needs attention
          </div>
          <p className="text-3xl font-semibold text-gray-900">{attentionDevices.length}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My devices needing attention</h2>
            <p className="mt-1 text-sm text-gray-500">
              Devices in your fleet that may require connect or lockdown action.
            </p>
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
                <th className="pb-3 pr-4 font-medium">Connection</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {attentionDevices.map((device) => {
                const ops = deviceOps[device.id]
                return (
                  <tr key={device.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.group}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[device.status]}`}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{device.soc}%</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs font-medium ${ops?.connected ? 'text-emerald-600' : 'text-gray-500'}`}
                      >
                        {ops?.connected ? 'Connected' : 'Not connected'}
                      </span>
                    </td>
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">My recent activity</h2>
        {myActivities.length > 0 ? (
          <div className="space-y-3">
            {myActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-1 border-b border-gray-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action} · {activity.target}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{activity.timestamp}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent actions yet. Connect or manage devices to see activity here.</p>
        )}
      </Card>
    </div>
  )
}
