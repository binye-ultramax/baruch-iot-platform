import {
  Activity,
  Battery,
  Signal,
  Thermometer,
  Timer,
  Wifi,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { DeviceData, ScorecardMetric } from '../../data/mockDevices'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'

const iconMap = {
  runtime: Timer,
  signal: Wifi,
  balance: Battery,
  temperature: Thermometer,
  reporting: Activity,
} as const

function MetricIcon({ metric }: { metric: ScorecardMetric }) {
  const Icon = iconMap[metric.icon] ?? Signal
  return <Icon className="h-4 w-4 text-gray-400" />
}

interface SocScorecardProps {
  device: DeviceData
  className?: string
}

export function SocScorecard({ device, className = '' }: SocScorecardProps) {
  const donutData = [
    { name: 'soc', value: device.soc },
    { name: 'remaining', value: 100 - device.soc },
  ]

  return (
    <Card className={`h-full ${className}`}>
      <h2 className="mb-6 text-lg font-semibold text-gray-900">SOC Scorecard</h2>

      <div className="mb-6 flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={55}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#6366f1" />
                <Cell fill="#e5e7eb" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{device.soc}%</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="mb-2 text-sm text-gray-500">Current Battery Energy</p>
          <div className="mb-1 flex items-center gap-2">
            <Battery className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-gray-900">
              {device.energyKwh} kWh / {device.capacityKwh} kWh
            </span>
            <span className="text-sm text-gray-500">{device.soc}%</span>
          </div>
          <ProgressBar value={device.soc} />
        </div>
      </div>

      <div className="space-y-4">
        {device.scorecardMetrics.map((metric) => (
          <div key={metric.id} className="flex items-center gap-3">
            <MetricIcon metric={metric} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700">{metric.label}</span>
                <span className="text-gray-500">
                  {metric.percent}% ({metric.status})
                </span>
              </div>
              <ProgressBar value={metric.percent} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
