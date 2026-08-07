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
  firmware: string
  hardware: string
  connectivity: string
  chemistry: string
  samplingInterval: string
  uploadInterval: string
  monitoredPacks: number
  socHistory: SocDataPoint[]
  scorecardMetrics: ScorecardMetric[]
  cells: CellData[]
  packLabel: string
  avgTemp: number
}

const cellVoltages = [
  3.41, 3.4, 3.39, 3.39, 3.38, 3.38, 3.38, 3.37,
  3.41, 3.4, 3.39, 3.39, 3.38, 3.38, 3.38, 3.37,
]

const cellBalances = [
  0.85, 0.78, 0.72, 0.68, 0.62, 0.58, 0.52, 0.48,
  0.88, 0.82, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5,
]

function buildCells(): CellData[] {
  return cellVoltages.map((voltage, index) => ({
    id: index + 1,
    voltage,
    balance: cellBalances[index],
  }))
}

function buildSocHistory(startSoc: number): SocDataPoint[] {
  return Array.from({ length: 25 }, (_, i) => ({
    hour: i,
    soc: Math.round((startSoc - i * 0.17) * 10) / 10,
  }))
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
}

const deviceSeeds: DeviceSeed[] = [
  {
    id: 'dev-01',
    name: 'DEV-01',
    group: 'Premium Fleet',
    status: 'online',
    location: { lat: 40.758, lng: -73.9855, address: 'Times Square, New York' },
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
    location: { lat: 40.7484, lng: -73.9857, address: 'Empire State Building, New York' },
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
    location: { lat: 40.7614, lng: -73.9776, address: 'Central Park South, New York' },
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
    location: { lat: 40.7061, lng: -74.0087, address: 'Wall Street, New York' },
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
    location: { lat: 40.7527, lng: -73.9772, address: 'Grand Central, New York' },
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
    location: { lat: 40.7282, lng: -73.9942, address: 'Greenwich Village, New York' },
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
    location: { lat: 40.7794, lng: -73.9632, address: 'Upper East Side, New York' },
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
    location: { lat: 40.6892, lng: -74.0445, address: 'Statue of Liberty, New York' },
    soc: 63,
    runtimeHours: 21.3,
    lastUpdate: '15 May 2025, 09:20 AM',
    age: '2.7 years',
  },
]

function buildDevice(seed: DeviceSeed): DeviceData {
  const energyKwh = Math.round((seed.soc / 100) * 75 * 10) / 10

  return {
    ...seed,
    model: 'Baruch Gateway X1',
    energyKwh,
    capacityKwh: 75,
    firmware: 'v2.4.1',
    hardware: 'HW 1.3',
    connectivity: 'LTE + Bluetooth',
    chemistry: 'LiFePO4',
    samplingInterval: '3 s',
    uploadInterval: '60 s',
    monitoredPacks: 4,
    packLabel: 'Pack A',
    avgTemp: 27,
    socHistory: buildSocHistory(seed.soc + 4),
    scorecardMetrics: buildScorecardMetrics(seed.runtimeHours, seed.soc),
    cells: buildCells(),
  }
}

export const devices: DeviceData[] = deviceSeeds.map(buildDevice)

export const device = devices[0]

export function getDeviceById(id: string): DeviceData | undefined {
  return devices.find((entry) => entry.id === id)
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
