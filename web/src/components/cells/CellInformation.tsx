import { CheckCircle2 } from 'lucide-react'
import type { DeviceData } from '../../data/mockDevices'
import { getCellStats } from '../../data/mockDevices'
import { Card } from '../ui/Card'

function BalanceIndicator({ balance }: { balance: number }) {
  return (
    <div className="relative h-1.5 flex-1 rounded-full bg-gray-200">
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success"
        style={{ left: `${balance * 100}%` }}
      />
    </div>
  )
}

interface CellInformationProps {
  device: DeviceData
  className?: string
}

export function CellInformation({ device, className = '' }: CellInformationProps) {
  const stats = getCellStats(device.cells)

  return (
    <Card className={`h-full ${className}`}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Cell Information</h2>
        <span className="text-sm font-medium text-primary">{device.packLabel}</span>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <span>
          <span className="text-gray-500">Cells: </span>
          <span className="font-medium text-gray-900">{stats.count}</span>
        </span>
        <span>
          <span className="text-gray-500">Min cell: </span>
          <span className="font-medium text-gray-900">{stats.min.toFixed(2)} V</span>
        </span>
        <span>
          <span className="text-gray-500">Max cell: </span>
          <span className="font-medium text-gray-900">{stats.max.toFixed(2)} V</span>
        </span>
        <span>
          <span className="text-gray-500">Delta: </span>
          <span className="font-medium text-gray-900">{stats.delta.toFixed(2)} V</span>
        </span>
        <span>
          <span className="text-gray-500">Avg temp: </span>
          <span className="font-medium text-gray-900">{device.avgTemp}°C</span>
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {device.cells.map((cell) => (
          <div key={cell.id} className="flex items-center gap-3 text-sm">
            <span className="w-14 shrink-0 text-gray-500">Cell {cell.id}</span>
            <span className="w-10 shrink-0 font-medium text-gray-900">
              {cell.voltage.toFixed(2)}
            </span>
            <BalanceIndicator balance={cell.balance} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Balance status: Good</span>
      </div>
    </Card>
  )
}
