import { BatteryInsight } from '../cells/BatteryInsight'
import { CellInformation } from '../cells/CellInformation'
import type { DeviceData } from '../../data/mockDevices'
import { ResizableBlock } from '../ui/ResizableBlock'
import { Sidebar } from './Sidebar'
import { SocEvolutionChart } from '../soc/SocEvolutionChart'

interface DevicePageLayoutProps {
  device: DeviceData
}

export function DevicePageLayout({ device }: DevicePageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ResizableBlock
        direction="horizontal"
        defaultSize={{ width: 320 }}
        minSize={{ width: 260 }}
        maxSize={{ width: 420 }}
        className="min-h-screen shrink-0 border-r border-gray-200 bg-white"
      >
        <aside className="h-full min-h-screen px-6 pb-6 pt-0">
          <Sidebar device={device} />
        </aside>
      </ResizableBlock>

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-6 pb-6 pt-0">
        <section className="shrink-0">
          <BatteryInsight device={device} />
        </section>

        <section className="shrink-0">
          <SocEvolutionChart device={device} />
        </section>

        <section className="shrink-0">
          <ResizableBlock
            direction="vertical"
            defaultSize={{ height: 500 }}
            minSize={{ height: 380 }}
            maxSize={{ height: 800 }}
          >
            <CellInformation device={device} className="h-full" />
          </ResizableBlock>
        </section>
      </main>
    </div>
  )
}
