import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DeviceData } from '../../data/mockDevices'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { ToggleSwitch } from '../ui/ToggleSwitch'

interface SocEvolutionChartProps {
  device: DeviceData
}

export function SocEvolutionChart({ device }: SocEvolutionChartProps) {
  const [currentDevice, setCurrentDevice] = useState(true)
  const [fleetDevices, setFleetDevices] = useState(false)

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SOC Evolution</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            <ToggleSwitch
              label="Current device"
              checked={currentDevice}
              onChange={setCurrentDevice}
            />
            <ToggleSwitch
              label="Fleet devices"
              checked={fleetDevices}
              onChange={setFleetDevices}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-xs text-gray-500">Current SOC</p>
            <Badge>{device.soc}%</Badge>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-xs text-gray-500">Operating time estimate</p>
            <p className="text-sm font-semibold text-gray-900">{device.runtimeHours} h</p>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={device.socHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Time (hours)', position: 'insideBottom', offset: -2, fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'SOC (%)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, 'SOC']}
              labelFormatter={(hour) => `${hour} h`}
            />
            <Area
              type="monotone"
              dataKey="soc"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#socGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
