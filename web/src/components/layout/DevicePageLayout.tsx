import { CellInformation } from '../cells/CellInformation'
import type { DeviceData } from '../../data/mockDevices'
import { Sidebar } from './Sidebar'
import { SocEvolutionChart } from '../soc/SocEvolutionChart'
import { SocScorecard } from '../soc/SocScorecard'

interface DevicePageLayoutProps {
  device: DeviceData
}

export function DevicePageLayout({ device }: DevicePageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-80 shrink-0 border-r border-gray-200 bg-white p-6">
        <Sidebar device={device} />
      </aside>

      <main className="flex-1 space-y-6 p-6">
        <SocEvolutionChart device={device} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SocScorecard device={device} />
          <CellInformation device={device} />
        </div>
      </main>
    </div>
  )
}
