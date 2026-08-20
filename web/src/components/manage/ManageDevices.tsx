import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePlatform } from '../../context/PlatformContext'
import { type DeviceStatus } from '../../data/mockDevices'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const statusStyles: Record<DeviceStatus, string> = {
  online: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  offline: 'bg-gray-100 text-gray-600',
}

export function ManageDevices() {
  const { user } = useAuth()
  const { deviceOps, getManagedDevices, setDeviceConnected, setDeviceLockedDown } = usePlatform()

  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all')
  const [fleetFilter, setFleetFilter] = useState('all')

  if (!user) return null

  const myDevices = getManagedDevices(user.email)

  const fleetOptions = useMemo(
    () => Array.from(new Set(myDevices.map((device) => device.group))),
    [myDevices],
  )

  const filteredDevices = myDevices.filter((device) => {
    if (statusFilter !== 'all' && device.status !== statusFilter) return false
    if (fleetFilter !== 'all' && device.group !== fleetFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My fleet devices</h2>
            <p className="mt-1 text-sm text-gray-500">
              Connect, disconnect, and lock down devices assigned to your account.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | DeviceStatus)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="offline">Offline</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                Fleet
              </span>
              <select
                value={fleetFilter}
                onChange={(event) => setFleetFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="all">All fleets</option>
                {fleetOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 font-medium">Device</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Fleet</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Connection</th>
                <th className="pb-3 pr-4 font-medium">Lockdown</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => {
                const ops = deviceOps[device.id] ?? { connected: false, lockedDown: false }
                const isMonitor = device.model.includes('Bluetooth Monitor')

                return (
                  <tr key={device.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.model}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="muted">{isMonitor ? 'Monitor' : 'Gateway'}</Badge>
                    </td>
                    <td className="py-4 pr-4 text-gray-600">{device.group}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[device.status]}`}
                      >
                        {device.status}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">{device.soc}% SOC</p>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`text-xs font-medium ${ops.connected ? 'text-emerald-600' : 'text-gray-500'}`}
                      >
                        {ops.connected ? 'Connected' : 'Not connected'}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`text-xs font-medium ${ops.lockedDown ? 'text-red-600' : 'text-gray-500'}`}
                      >
                        {ops.lockedDown ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={ops.lockedDown}
                          onClick={() =>
                            setDeviceConnected(device.id, !ops.connected, user.name)
                          }
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {ops.connected ? 'Disconnect' : 'Connect'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeviceLockedDown(device.id, !ops.lockedDown, user.name)
                          }
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            ops.lockedDown
                              ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          {ops.lockedDown ? 'Release' : 'Lock down'}
                        </button>
                        <Link
                          to={`/devices/${device.id}`}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-light/40"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
