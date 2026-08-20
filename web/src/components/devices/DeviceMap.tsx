import L from 'leaflet'
import { MapResizeHandler } from './MapResizeHandler'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { DeviceData } from '../../data/mockDevices'
import { Badge } from '../ui/Badge'

const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#6366f1;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

interface DeviceMapProps {
  devices: DeviceData[]
  selectedId?: string
}

export function DeviceMap({ devices, selectedId }: DeviceMapProps) {
  const center: [number, number] = [51.5074, -0.1278]

  return (
    <MapContainer center={center} zoom={12} className="h-full w-full min-h-[280px]">
      <MapResizeHandler />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {devices.map((device) => (
        <Marker
          key={device.id}
          position={[device.location.lat, device.location.lng]}
          icon={markerIcon}
          opacity={selectedId && selectedId !== device.id ? 0.5 : 1}
        >
          <Popup>
            <div className="min-w-40 space-y-2 text-sm">
              <p className="font-semibold text-gray-900">{device.name}</p>
              <p className="text-gray-500">{device.location.address}</p>
              <div className="flex items-center gap-2">
                <Badge>{device.soc}%</Badge>
                <span className="capitalize text-gray-600">{device.status}</span>
              </div>
              <Link
                to={`/devices/${device.id}`}
                className="inline-block text-primary hover:underline"
              >
                View details
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
