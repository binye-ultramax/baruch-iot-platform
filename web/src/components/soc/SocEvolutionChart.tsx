import { Battery } from 'lucide-react'
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
import { ProgressBar } from '../ui/ProgressBar'

interface SocEvolutionChartProps {
  device: DeviceData
  className?: string
}

export function SocEvolutionChart({ device, className = '' }: SocEvolutionChartProps) {
  return (
    <Card className={`pt-3 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">SOC Evolution</h2>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-xs text-gray-500">Current SOC</p>
            <Badge>{device.soc}%</Badge>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-xs text-gray-500">Operating time estimate</p>
            <p className="text-sm font-semibold text-gray-900">{device.runtimeHours} h</p>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-500">Battery energy</p>
            <div className="mt-1 flex items-center gap-2">
              <Battery className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-gray-900">
                {device.energyKwh} / {device.capacityKwh} kWh
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ProgressBar value={device.soc} />
      </div>

      <div className="w-full">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={device.socHistory}
            margin={{ top: 4, right: 16, left: 4, bottom: 32 }}
          >
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
              ticks={[0, 4, 8, 12, 16, 20, 24]}
              label={{
                value: 'Time (hours)',
                position: 'bottom',
                offset: 12,
                fontSize: 12,
                fill: '#6b7280',
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{
                value: 'SOC (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fontSize: 12,
                fill: '#6b7280',
              }}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, 'SOC']}
              labelFormatter={(hour) => `${hour} h`}
            />
            <Area
              type="linear"
              dataKey="soc"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#socGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
