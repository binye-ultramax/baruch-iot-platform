import { MapPin, Router } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DeviceMap } from '../components/devices/DeviceMap'
import { AppHeader } from '../components/layout/AppHeader'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { devices, type DeviceStatus } from '../data/mockDevices'

const statusStyles: Record<DeviceStatus, string> = {
  online: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  offline: 'bg-gray-100 text-gray-600',
}

export function DeviceListPage() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string>()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppHeader
        title="Device Fleet"
        subtitle={`Signed in as ${user?.name} (${user?.role})`}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full border-b border-gray-200 bg-white lg:w-96 lg:border-r lg:border-b-0">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{devices.length} devices</p>
            <p className="text-xs text-gray-500">All devices shown on the map</p>
          </div>

          <ul className="max-h-80 overflow-y-auto lg:max-h-none lg:flex-1">
            {devices.map((device) => (
              <li key={device.id}>
                <Link
                  to={`/devices/${device.id}`}
                  onMouseEnter={() => setSelectedId(device.id)}
                  onMouseLeave={() => setSelectedId(undefined)}
                  className={`block border-b border-gray-100 px-4 py-4 transition-colors hover:bg-gray-50 ${
                    selectedId === device.id ? 'bg-primary-light/40' : ''
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                        <Router className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-xs text-gray-500">{device.model}</p>
                      </div>
                    </div>
                    <Badge>{device.soc}%</Badge>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{device.location.address}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{device.group}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium capitalize ${statusStyles[device.status]}`}
                    >
                      {device.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-h-80 flex-1 p-4 lg:min-h-0">
          <DeviceMap devices={devices} selectedId={selectedId} />
        </main>
      </div>
    </div>
  )
}
