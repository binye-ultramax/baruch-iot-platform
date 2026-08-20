import { getEffectiveOwnerEmail } from './deviceOwnership'

export interface DeviceLocation {
  lat: number
  lng: number
  address: string
}

export interface SocDataPoint {
  hour: number
  soc: number
}

export interface ScorecardMetric {
  id: string
  label: string
  percent: number
  status: string
  icon: 'runtime' | 'signal' | 'balance' | 'temperature' | 'reporting'
}

export interface CellData {
  id: number
  voltage: number
  balance: number
  soh: number
}

export interface BatteryPack {
  id: string
  label: string
  cells: CellData[]
  avgTemp: number
}

export type DeviceStatus = 'online' | 'offline' | 'warning'

export interface DeviceData {
  id: string
  name: string
  model: string
  age: string
  group: string
  status: DeviceStatus
  location: DeviceLocation
  soc: number
  energyKwh: number
  capacityKwh: number
  runtimeHours: number
  lastUpdate: string
  deltaTargetToLifeYears: number
  deltaTargetToLifeTrend: number
  batterySoh: number
  batterySohTrend: number
  associatedFleets: string[]
  firmware: string
  hardware: string
  connectivity: string
  chemistry: string
  samplingInterval: string
  uploadInterval: string
  monitoredPacks: number
  ownerEmail?: string
  socHistory: SocDataPoint[]
  scorecardMetrics: ScorecardMetric[]
  packs: BatteryPack[]
}

const cellVoltages = [
  3.41, 3.4, 3.39, 3.39, 3.38, 3.38, 3.38, 3.37,
  3.41, 3.4, 3.39, 3.39, 3.38, 3.38, 3.38, 3.37,
]

const cellBalances = [
  0.85, 0.78, 0.72, 0.68, 0.62, 0.58, 0.52, 0.48,
  0.88, 0.82, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5,
]

const packLabels = ['Pack A', 'Pack B', 'Pack C', 'Pack D']

const secondaryFleetNames = [
  'North Region Ops',
  'Example of long fleet name',
  'Metro Backup Unit',
  'Field Response Team',
  'Coastal Monitoring',
]

function averagePackSoh(packs: BatteryPack[]): number {
  const values = packs.flatMap((pack) => pack.cells.map((cell) => cell.soh))
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(avg * 10) / 10
}

function buildDeltaTargetToLifeYears(age: string, batterySoh: number, deviceId: string): number {
  const ageYears = Number.parseFloat(age)
  const deviceNumber = Number.parseInt(deviceId.replace(/\D/g, ''), 10) || 1
  const base = -0.8 - ageYears * 0.25 + (batterySoh - 75) * 0.04 + (deviceNumber % 5) * 0.15
  return Math.round(base * 10) / 10
}

function buildAssociatedFleets(group: string, deviceId: string): string[] {
  const deviceNumber = Number.parseInt(deviceId.replace(/\D/g, ''), 10) || 1
  const secondary = secondaryFleetNames[deviceNumber % secondaryFleetNames.length]
  return group === secondary ? [group, 'Premium Fleet'] : [group, secondary]
}

function formatLastDataUpdate(lastUpdate: string): string {
  const parsed = Date.parse(lastUpdate.replace(/(\d+) (\w+) (\d+), (.*)/, '$2 $1, $3 $4'))
  if (Number.isNaN(parsed)) {
    return `${lastUpdate} GMT`
  }

  const date = new Date(parsed)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} GMT`
}

function packCountForDevice(id: string): number {
  const deviceNumber = Number.parseInt(id.replace(/\D/g, ''), 10) || 1
  return 2 + (deviceNumber % 3)
}

function buildCells(seed: DeviceSeed, packIndex: number): CellData[] {
  const ageYears = Number.parseFloat(seed.age)
  const baseSoh = Math.max(
    70,
    Math.min(100, 100 - ageYears * 3 - (100 - seed.soc) * 0.05 - packIndex * 1.2),
  )
  const voltageOffset = packIndex * 0.015

  return cellVoltages.map((voltage, index) => ({
    id: index + 1,
    voltage: Math.round((voltage - voltageOffset + seededNoise(seed.id, index + packIndex * 20) * 0.02) * 100) / 100,
    balance: Math.min(
      1,
      Math.max(0, cellBalances[index] - packIndex * 0.04 + seededNoise(seed.id, index + packIndex * 30) * 0.05),
    ),
    soh: Math.round((baseSoh - (index % 4) * 0.7) * 10) / 10,
  }))
}

function buildPacks(seed: DeviceSeed): BatteryPack[] {
  const count = seed.packCount ?? packCountForDevice(seed.id)

  return Array.from({ length: count }, (_, packIndex) => ({
    id: `${seed.id}-pack-${packIndex + 1}`,
    label: packLabels[packIndex],
    cells: buildCells(seed, packIndex),
    avgTemp: Math.round((26 + packIndex * 0.8 + seededNoise(seed.id, packIndex + 40) * 1.5) * 10) / 10,
  }))
}

function seededNoise(seed: string, hour: number): number {
  let hash = 0
  const key = `${seed}-${hour}`
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return ((hash & 0xffff) / 0xffff - 0.5) * 1.4
}

function loadSpike(seed: string, step: number): number {
  const slot = Math.floor(step / 2)
  if ((slot + seed.charCodeAt(seed.length - 1)) % 5 === 0) {
    return -0.9 - seededNoise(seed, step + 200) * 0.5
  }
  if ((slot + seed.charCodeAt(0)) % 7 === 0) {
    return 0.45 + seededNoise(seed, step + 300) * 0.35
  }
  return 0
}

function clampSoc(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}

function buildSocHistory(currentSoc: number, seed: DeviceSeed): SocDataPoint[] {
  const steps = 49
  const stepHours = 0.5
  const points: number[] = []

  if (seed.status === 'offline') {
    const staleLevel = clampSoc(currentSoc + 4)
    for (let step = 0; step < steps - 4; step += 1) {
      points.push(staleLevel + seededNoise(seed.id, step) * 0.15)
    }
    for (let step = steps - 4; step < steps - 1; step += 1) {
      const t = (step - (steps - 4)) / 3
      points.push(clampSoc(staleLevel - t * 2.5))
    }
    points.push(currentSoc)
    return points.map((soc, step) => ({ hour: step * stepHours, soc }))
  }

  const dailyUse =
    seed.status === 'warning' ? 1.45 : seed.group === 'Premium Fleet' ? 1.05 : 1.2

  const dailyDrop = Math.min(28, Math.max(14, 16 + (100 - currentSoc) * 0.06))

  let value = clampSoc(currentSoc + dailyDrop + seededNoise(seed.id, 0) * 2.5)
  points.push(value)

  for (let step = 1; step < steps; step += 1) {
    const hour = step * stepHours
    let delta = 0

    if (hour <= 6) {
      delta = -0.22 + seededNoise(seed.id, step) * 0.55
    } else if (hour <= 9) {
      delta = -(0.75 + seededNoise(seed.id, step) * 0.65) * dailyUse
    } else if (hour <= 11) {
      delta = -(0.95 + seededNoise(seed.id, step) * 0.55) * dailyUse
    } else if (hour <= 14) {
      delta = 0.25 + seededNoise(seed.id, step + 50) * 0.45
    } else if (hour <= 18) {
      delta = -(0.8 + seededNoise(seed.id, step) * 0.6) * dailyUse
    } else if (hour <= 21) {
      delta = -(0.55 + seededNoise(seed.id, step) * 0.45) * dailyUse
    } else {
      delta = -(0.35 + seededNoise(seed.id, step) * 0.35) * dailyUse
    }

    delta += loadSpike(seed.id, step)
    value = clampSoc(value + delta)
    points.push(value)
  }

  const endDrift = currentSoc - points[steps - 1]
  for (let step = 0; step < steps; step += 1) {
    const progress = step / (steps - 1)
    points[step] = clampSoc(points[step] + endDrift * progress)
  }
  points[steps - 1] = currentSoc

  return points.map((soc, step) => ({ hour: step * stepHours, soc }))
}

function buildScorecardMetrics(runtimeHours: number, soc: number): ScorecardMetric[] {
  return [
    {
      id: 'runtime',
      label: 'Estimated runtime',
      percent: Math.min(100, Math.round((runtimeHours / 32) * 100)),
      status: `${runtimeHours} h`,
      icon: 'runtime',
    },
    {
      id: 'signal',
      label: 'Network signal',
      percent: soc > 50 ? 82 : 64,
      status: soc > 50 ? 'Good' : 'Fair',
      icon: 'signal',
    },
    {
      id: 'balance',
      label: 'Cell balance',
      percent: soc > 40 ? 91 : 76,
      status: soc > 40 ? 'Excellent' : 'Good',
      icon: 'balance',
    },
    {
      id: 'temperature',
      label: 'Temperature status',
      percent: 78,
      status: 'Normal',
      icon: 'temperature',
    },
    {
      id: 'reporting',
      label: 'Data reporting',
      percent: 85,
      status: 'Good',
      icon: 'reporting',
    },
  ]
}

interface DeviceSeed {
  id: string
  name: string
  group: string
  status: DeviceStatus
  location: DeviceLocation
  soc: number
  runtimeHours: number
  lastUpdate: string
  age: string
  ownerEmail?: string
  model?: string
  connectivity?: string
  packCount?: number
  firmware?: string
  hardware?: string
  samplingInterval?: string
  uploadInterval?: string
}

const deviceSeeds: DeviceSeed[] = [
  {
    id: 'dev-01',
    name: 'DEV-01',
    group: 'Premium Fleet',
    status: 'online',
    location: { lat: 51.5238, lng: -0.1585, address: '42 Baker Street, Marylebone, London W1U 7RT' },
    soc: 68,
    runtimeHours: 23.6,
    lastUpdate: '15 May 2025, 09:32 AM',
    age: '2.3 years',
  },
  {
    id: 'dev-02',
    name: 'DEV-02',
    group: 'Premium Fleet',
    status: 'online',
    location: { lat: 51.5136, lng: -0.1106, address: '15 Fleet Street, City of London EC4Y 1AA' },
    soc: 82,
    runtimeHours: 28.4,
    lastUpdate: '15 May 2025, 09:28 AM',
    age: '1.8 years',
  },
  {
    id: 'dev-03',
    name: 'DEV-03',
    group: 'Standard Fleet',
    status: 'warning',
    location: { lat: 51.5392, lng: -0.1426, address: '88 Camden High Street, Camden, London NW1 0LT' },
    soc: 34,
    runtimeHours: 11.2,
    lastUpdate: '15 May 2025, 08:45 AM',
    age: '3.1 years',
  },
  {
    id: 'dev-04',
    name: 'DEV-04',
    group: 'Standard Fleet',
    status: 'online',
    location: { lat: 51.5246, lng: -0.0787, address: '22 Shoreditch High Street, Hackney, London E1 6PJ' },
    soc: 91,
    runtimeHours: 31.5,
    lastUpdate: '15 May 2025, 09:30 AM',
    age: '1.2 years',
  },
  {
    id: 'dev-05',
    name: 'DEV-05',
    group: 'Premium Fleet',
    status: 'online',
    location: { lat: 51.5089, lng: -0.1339, address: '7 Regent Street, Westminster, London SW1Y 4LR' },
    soc: 55,
    runtimeHours: 18.9,
    lastUpdate: '15 May 2025, 09:15 AM',
    age: '2.0 years',
  },
  {
    id: 'dev-06',
    name: 'DEV-06',
    group: 'Standard Fleet',
    status: 'offline',
    location: { lat: 51.5045, lng: -0.0865, address: '31 Borough High Street, Southwark, London SE1 1JA' },
    soc: 12,
    runtimeHours: 4.1,
    lastUpdate: '14 May 2025, 11:02 PM',
    age: '4.5 years',
  },
  {
    id: 'dev-07',
    name: 'DEV-07',
    group: 'Premium Fleet',
    status: 'online',
    location: { lat: 51.5154, lng: -0.2051, address: '56 Portobello Road, Notting Hill, London W11 3DG' },
    soc: 74,
    runtimeHours: 25.8,
    lastUpdate: '15 May 2025, 09:25 AM',
    age: '1.5 years',
  },
  {
    id: 'dev-08',
    name: 'DEV-08',
    group: 'Standard Fleet',
    status: 'online',
    location: { lat: 51.4934, lng: -0.0768, address: '12 Old Kent Road, Bermondsey, London SE1 5NY' },
    soc: 63,
    runtimeHours: 21.3,
    lastUpdate: '15 May 2025, 09:20 AM',
    age: '2.7 years',
  },
  {
    id: 'dev-bt-admin',
    name: 'BM-01',
    group: 'Personal Devices',
    status: 'online',
    location: {
      lat: 51.5054,
      lng: -0.0235,
      address: '25 Canada Square, Canary Wharf, London E14 5LQ',
    },
    soc: 88,
    runtimeHours: 42.0,
    lastUpdate: '15 May 2025, 09:40 AM',
    age: '0.6 years',
    ownerEmail: 'admin@baruch.io',
    model: 'Baruch Bluetooth Monitor',
    connectivity: 'Bluetooth',
    packCount: 1,
    firmware: 'v1.2.0',
    hardware: 'HW 1.0',
    samplingInterval: '5 s',
    uploadInterval: 'On demand',
  },
  {
    id: 'dev-bt-operator',
    name: 'BM-01',
    group: 'Personal Devices',
    status: 'online',
    location: {
      lat: 51.5101,
      lng: -0.1301,
      address: '14 Leicester Square, Westminster, London WC2H 7LU',
    },
    soc: 76,
    runtimeHours: 36.5,
    lastUpdate: '15 May 2025, 09:38 AM',
    age: '0.4 years',
    ownerEmail: 'operator@baruch.io',
    model: 'Baruch Bluetooth Monitor',
    connectivity: 'Bluetooth',
    packCount: 1,
    firmware: 'v1.2.0',
    hardware: 'HW 1.0',
    samplingInterval: '5 s',
    uploadInterval: 'On demand',
  },
]

function buildDevice(seed: DeviceSeed): DeviceData {
  const packs = buildPacks(seed)
  const capacityKwh = packs.length * 18.75
  const energyKwh = Math.round((seed.soc / 100) * capacityKwh * 10) / 10
  const batterySoh = averagePackSoh(packs)
  const deviceNumber = Number.parseInt(seed.id.replace(/\D/g, ''), 10) || 1

  return {
    ...seed,
    model: seed.model ?? 'Baruch Gateway X1',
    energyKwh,
    capacityKwh,
    lastUpdate: formatLastDataUpdate(seed.lastUpdate),
    deltaTargetToLifeYears: buildDeltaTargetToLifeYears(seed.age, batterySoh, seed.id),
    deltaTargetToLifeTrend: -Math.round((0.1 + (deviceNumber % 4) * 0.05) * 10) / 10,
    batterySoh,
    batterySohTrend: -Math.round((0.1 + (deviceNumber % 3) * 0.05) * 10) / 10,
    associatedFleets: buildAssociatedFleets(seed.group, seed.id),
    firmware: seed.firmware ?? 'v2.4.1',
    hardware: seed.hardware ?? 'HW 1.3',
    connectivity: seed.connectivity ?? 'LTE + Bluetooth',
    chemistry: 'LiFePO4',
    samplingInterval: seed.samplingInterval ?? '3 s',
    uploadInterval: seed.uploadInterval ?? '60 s',
    monitoredPacks: packs.length,
    ownerEmail: seed.ownerEmail,
    socHistory: buildSocHistory(seed.soc, seed),
    scorecardMetrics: buildScorecardMetrics(seed.runtimeHours, seed.soc),
    packs,
  }
}

export const devices: DeviceData[] = deviceSeeds.map(buildDevice)

export const device = devices[0]

export function getDeviceById(id: string): DeviceData | undefined {
  return devices.find((entry) => entry.id === id)
}

export function getDevicesForUser(email: string): DeviceData[] {
  return devices.filter((entry) => {
    const ownerEmail = getEffectiveOwnerEmail(entry.id, entry.ownerEmail)
    return !ownerEmail || ownerEmail === email
  })
}

export function getCellStats(cells: CellData[]) {
  const voltages = cells.map((c) => c.voltage)
  const min = Math.min(...voltages)
  const max = Math.max(...voltages)
  return {
    count: cells.length,
    min,
    max,
    delta: Math.round((max - min) * 100) / 100,
  }
}

export function getCellSohStats(cells: CellData[]) {
  const sohValues = cells.map((c) => c.soh)
  const min = Math.min(...sohValues)
  const max = Math.max(...sohValues)
  const avg = Math.round((sohValues.reduce((sum, value) => sum + value, 0) / sohValues.length) * 10) / 10

  return { count: cells.length, min, max, avg }
}

function getSohBarColor(soh: number): string {
  if (soh >= 90) return 'bg-success'
  if (soh >= 80) return 'bg-amber-400'
  return 'bg-red-400'
}

export function getSohBarColorClass(soh: number): string {
  return getSohBarColor(soh)
}

export function getSohStatus(soh: number): string {
  if (soh >= 90) return 'Excellent'
  if (soh >= 80) return 'Good'
  if (soh >= 70) return 'Fair'
  return 'Degraded'
}
