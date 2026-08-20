import { Link } from 'react-router-dom'
import { Router } from 'lucide-react'
import type { DeviceData } from '../../data/mockDevices'
import { Accordion, DetailRow } from '../ui/Accordion'
import { DeviceActionPanel } from './DeviceActionPanel'
import { DeviceHealthSummary } from './DeviceHealthSummary'

interface SidebarProps {
  device: DeviceData
}

export function Sidebar({ device }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <nav className="mb-2 text-sm text-gray-500">
        <Link to="/devices" className="hover:text-primary">
          Devices
        </Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-gray-700">{device.id}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{device.name}</h1>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-light">
          <Router className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1 text-sm">
          <DetailRow label="Device model" value={device.model} />
          <DetailRow label="Device age" value={device.age} />
          <DetailRow label="Primary group" value={device.group} />
        </div>
      </div>

      <DeviceHealthSummary device={device} />

      <DeviceActionPanel device={device} />

      <div className="mt-auto space-y-1">
        <Accordion title="Device details" defaultOpen>
          <DetailRow label="ID" value={device.id} />
          <DetailRow label="Firmware version" value={device.firmware} />
          <DetailRow label="Hardware version" value={device.hardware} />
          <DetailRow label="Connectivity" value={device.connectivity} />
          <DetailRow label="Battery chemistry" value={device.chemistry} />
        </Accordion>

        <Accordion title="Device configurations">
          <DetailRow label="Sampling interval" value={device.samplingInterval} />
          <DetailRow label="Upload interval" value={device.uploadInterval} />
          <DetailRow label="Connectivity mode" value={device.connectivity} />
          <DetailRow label="Monitored packs" value={String(device.monitoredPacks)} />
        </Accordion>
      </div>
    </div>
  )
}
