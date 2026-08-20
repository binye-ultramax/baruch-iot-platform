import {
  Activity,
  Battery,
  Lightbulb,
  Thermometer,
  Timer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DeviceData } from '../../data/mockDevices'
import { getSohStatus } from '../../data/mockDevices'
import { Card } from '../ui/Card'

interface BatteryInsightProps {
  device: DeviceData
  className?: string
}

interface InsightItem {
  id: string
  category: string
  text: string
  icon: LucideIcon
  accentClass: string
}

function getScorecardMetric(device: DeviceData, id: string) {
  return device.scorecardMetrics.find((metric) => metric.id === id)
}

function buildInsights(device: DeviceData): InsightItem[] {
  const insights: InsightItem[] = []
  const balance = getScorecardMetric(device, 'balance')
  const temperature = getScorecardMetric(device, 'temperature')
  const runtime = getScorecardMetric(device, 'runtime')

  const packTemps = device.packs.map((pack) => pack.avgTemp)
  const avgFleetTemp =
    packTemps.reduce((sum, temp) => sum + temp, 0) / Math.max(packTemps.length, 1)
  const hottestPack = device.packs.reduce((hottest, pack) =>
    pack.avgTemp > hottest.avgTemp ? pack : hottest,
  )

  if (hottestPack.avgTemp > avgFleetTemp + 0.8) {
    insights.push({
      id: 'thermal',
      category: 'Thermal',
      text: `${hottestPack.label} runs ${(hottestPack.avgTemp - avgFleetTemp).toFixed(1)}°C hotter than the pack average.`,
      icon: Thermometer,
      accentClass: 'border-amber-400 bg-amber-50 text-amber-800',
    })
  }

  if (balance) {
    insights.push({
      id: 'balance',
      category: 'Balance',
      text: `Cell balance score is ${balance.status.toLowerCase()} (${balance.percent}%).`,
      icon: Battery,
      accentClass: 'border-emerald-400 bg-emerald-50 text-emerald-800',
    })
  }

  if (device.batterySohTrend < 0) {
    insights.push({
      id: 'soh-trend',
      category: 'Degradation',
      text: `Battery SOH trend is ${device.batterySohTrend}% — monitor degradation over the next review cycle.`,
      icon: Activity,
      accentClass: 'border-orange-400 bg-orange-50 text-orange-800',
    })
  }

  if (temperature) {
    insights.push({
      id: 'temperature',
      category: 'Temperature',
      text: `Temperature status: ${temperature.status.toLowerCase()}.`,
      icon: Thermometer,
      accentClass: 'border-sky-400 bg-sky-50 text-sky-800',
    })
  }

  if (runtime) {
    insights.push({
      id: 'runtime',
      category: 'Runtime',
      text: `Estimated runtime at current load: ${runtime.status}.`,
      icon: Timer,
      accentClass: 'border-primary bg-primary-light text-indigo-800',
    })
  }

  return insights.slice(0, 4)
}

export function BatteryInsight({ device, className = '' }: BatteryInsightProps) {
  const balanceMetric = getScorecardMetric(device, 'balance')
  const temperatureMetric = getScorecardMetric(device, 'temperature')
  const insights = buildInsights(device)

  return (
    <Card className={`h-full ${className}`}>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Battery Insight</h2>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Battery SOH</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{Math.round(device.batterySoh)}%</p>
          <p className="mt-1 text-xs text-gray-500">{getSohStatus(device.batterySoh)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Balance score</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {balanceMetric?.percent ?? '—'}%
          </p>
          <p className="mt-1 text-xs text-gray-500">{balanceMetric?.status ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Temperature</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {temperatureMetric?.status ?? '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">{temperatureMetric?.percent ?? '—'}% nominal</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-5">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">Insights</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((insight) => {
            const Icon = insight.icon
            return (
              <article
                key={insight.id}
                className={`flex gap-3 rounded-lg border-l-4 px-4 py-3 ${insight.accentClass}`}
              >
                <div className="mt-0.5 shrink-0 rounded-md bg-white/70 p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {insight.category}
                  </p>
                  <p className="text-sm leading-relaxed">{insight.text}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
