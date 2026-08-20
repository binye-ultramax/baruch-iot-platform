import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { readDeviceOwners, writeDeviceOwners } from '../data/deviceOwnership'
import { devices, type DeviceData } from '../data/mockDevices'
import { getUserProfile, mockUsers } from '../data/mockUsers'

export interface PlatformSettings {
  uploadInterval: string
  samplingInterval: string
  dataRetention: string
  alertDelivery: string
  lowSocThreshold: number
  offlineAlertMinutes: number
}

export interface DeviceOpsState {
  connected: boolean
  lockedDown: boolean
}

export interface PlatformActivity {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
}

interface PlatformContextValue {
  settings: PlatformSettings
  updateSettings: (patch: Partial<PlatformSettings>) => void
  userRoles: Record<string, string>
  deviceOwners: Record<string, string>
  deviceOps: Record<string, DeviceOpsState>
  activities: PlatformActivity[]
  getDeviceOwnerEmail: (device: DeviceData) => string | undefined
  getOwnerLabel: (device: DeviceData) => string
  getManagedDevices: (email: string) => DeviceData[]
  updateUserRole: (email: string, role: string) => void
  assignPersonalDevice: (deviceId: string, email: string) => void
  setDeviceConnected: (deviceId: string, connected: boolean, actor?: string) => void
  setDeviceLockedDown: (deviceId: string, lockedDown: boolean, actor?: string) => void
  pushActivity: (action: string, target: string, actor: string) => void
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

const SHARED_FLEET_LABEL = 'Shared fleet'

function buildSeededDeviceOwners(): Record<string, string> {
  return Object.fromEntries(
    devices
      .filter((device) => device.ownerEmail)
      .map((device) => [device.id, device.ownerEmail!]),
  )
}

function loadDeviceOwners(): Record<string, string> {
  const stored = readDeviceOwners()
  if (Object.keys(stored).length > 0) return stored
  const seeded = buildSeededDeviceOwners()
  writeDeviceOwners(seeded)
  return seeded
}

function buildInitialDeviceOps(): Record<string, DeviceOpsState> {
  return Object.fromEntries(
    devices.map((device) => [
      device.id,
      {
        connected: false,
        lockedDown: device.status === 'offline',
      },
    ]),
  )
}

function formatActivityTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const initialActivities: PlatformActivity[] = [
  {
    id: 'act-1',
    timestamp: '15 May 2025, 09:05 AM',
    actor: 'Admin User',
    action: 'Reviewed platform overview',
    target: 'Administration',
  },
  {
    id: 'act-2',
    timestamp: '15 May 2025, 08:52 AM',
    actor: 'Fleet Operator',
    action: 'Connected to device',
    target: 'DEV-03',
  },
  {
    id: 'act-3',
    timestamp: '14 May 2025, 11:15 PM',
    actor: 'Admin User',
    action: 'Updated default upload interval',
    target: 'Platform settings',
  },
]

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>({
    uploadInterval: '60 s',
    samplingInterval: '3 s',
    dataRetention: '90 days',
    alertDelivery: 'Email + dashboard',
    lowSocThreshold: 20,
    offlineAlertMinutes: 30,
  })
  const [userRoles, setUserRoles] = useState<Record<string, string>>(
    Object.fromEntries(mockUsers.map((user) => [user.email, user.role])),
  )
  const [deviceOwners, setDeviceOwners] = useState<Record<string, string>>(loadDeviceOwners)
  const [deviceOps, setDeviceOps] = useState<Record<string, DeviceOpsState>>(
    buildInitialDeviceOps,
  )
  const [activities, setActivities] = useState<PlatformActivity[]>(initialActivities)

  const pushActivity = useCallback((action: string, target: string, actor: string) => {
    setActivities((current) => [
      {
        id: `act-${Date.now()}`,
        timestamp: formatActivityTime(new Date()),
        actor,
        action,
        target,
      },
      ...current.slice(0, 19),
    ])
  }, [])

  const getDeviceOwnerEmail = useCallback(
    (device: DeviceData) => deviceOwners[device.id] ?? device.ownerEmail,
    [deviceOwners],
  )

  const getOwnerLabel = useCallback(
    (device: DeviceData) => {
      const ownerEmail = getDeviceOwnerEmail(device)
      if (!ownerEmail) return SHARED_FLEET_LABEL
      const owner = mockUsers.find((user) => user.email === ownerEmail)
      return owner?.name ?? ownerEmail
    },
    [getDeviceOwnerEmail],
  )

  const getManagedDevices = useCallback(
    (email: string) => {
      const shared = devices.filter((device) => !getDeviceOwnerEmail(device))
      const personal = devices.filter((device) => getDeviceOwnerEmail(device) === email)
      return [...shared, ...personal]
    },
    [getDeviceOwnerEmail],
  )

  const updateSettings = useCallback(
    (patch: Partial<PlatformSettings>) => {
      setSettings((current) => ({ ...current, ...patch }))
      pushActivity('Updated platform settings', 'Platform settings', 'Admin User')
    },
    [pushActivity],
  )

  const updateUserRole = useCallback(
    (email: string, role: string) => {
      setUserRoles((current) => ({ ...current, [email]: role }))
      const user = mockUsers.find((entry) => entry.email === email)
      pushActivity(`Changed role to ${role}`, user?.name ?? email, 'Admin User')
    },
    [pushActivity],
  )

  const assignPersonalDevice = useCallback(
    (deviceId: string, email: string) => {
      setDeviceOwners((current) => {
        const next = { ...current, [deviceId]: email }
        writeDeviceOwners(next)
        return next
      })
      const device = devices.find((entry) => entry.id === deviceId)
      const user = mockUsers.find((entry) => entry.email === email)
      pushActivity(`Assigned ${device?.name ?? deviceId}`, user?.name ?? email, 'Admin User')
    },
    [pushActivity],
  )

  const setDeviceConnected = useCallback(
    (deviceId: string, connected: boolean, actor = 'Fleet Operator') => {
      setDeviceOps((current) => ({
        ...current,
        [deviceId]: {
          connected,
          lockedDown: connected ? false : current[deviceId]?.lockedDown ?? false,
        },
      }))
      const device = devices.find((entry) => entry.id === deviceId)
      pushActivity(
        connected ? 'Connected to device' : 'Disconnected from device',
        device?.name ?? deviceId,
        actor,
      )
    },
    [pushActivity],
  )

  const setDeviceLockedDown = useCallback(
    (deviceId: string, lockedDown: boolean, actor = 'Fleet Operator') => {
      setDeviceOps((current) => ({
        ...current,
        [deviceId]: {
          connected: lockedDown ? false : current[deviceId]?.connected ?? false,
          lockedDown,
        },
      }))
      const device = devices.find((entry) => entry.id === deviceId)
      pushActivity(
        lockedDown ? 'Locked down device' : 'Released device lockdown',
        device?.name ?? deviceId,
        actor,
      )
    },
    [pushActivity],
  )

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      userRoles,
      deviceOwners,
      deviceOps,
      activities,
      getDeviceOwnerEmail,
      getOwnerLabel,
      getManagedDevices,
      updateUserRole,
      assignPersonalDevice,
      setDeviceConnected,
      setDeviceLockedDown,
      pushActivity,
    }),
    [
      settings,
      updateSettings,
      userRoles,
      deviceOwners,
      deviceOps,
      activities,
      getDeviceOwnerEmail,
      getOwnerLabel,
      getManagedDevices,
      updateUserRole,
      assignPersonalDevice,
      setDeviceConnected,
      setDeviceLockedDown,
      pushActivity,
    ],
  )

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider')
  }
  return context
}

export function getUserLastLogin(email: string): string {
  return getUserProfile(email)?.lastLogin ?? '—'
}
