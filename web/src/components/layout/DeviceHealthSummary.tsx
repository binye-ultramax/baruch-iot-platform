import { Car, Shield } from 'lucide-react'
import type { DeviceData } from '../../data/mockDevices'

interface DeviceHealthSummaryProps {
  device: DeviceData
}

export function DeviceHealthSummary({ device }: DeviceHealthSummaryProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 text-sm">
        <span className="text-gray-500">Last Data update: </span>
        <span className="font-semibold text-gray-900">{device.lastUpdate}</span>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-3 text-sm text-gray-500">Associated Fleets:</p>
        <div className="flex flex-wrap gap-2">
          {device.associatedFleets.map((fleet, index) => (
            <span
              key={fleet}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
            >
              {index === 0 ? (
                <Shield className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              ) : (
                <Car className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              )}
              <span className="truncate">{fleet}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
