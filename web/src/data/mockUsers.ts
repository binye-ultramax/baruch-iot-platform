export interface MockUser {
  email: string
  password: string
  name: string
  role: string
}

export interface UserProfileDetails {
  department: string
  phone: string
  timezone: string
  joinedDate: string
  lastLogin: string
  managedDevices: number
  notifications: {
    emailAlerts: boolean
    smsAlerts: boolean
    weeklyReports: boolean
    deviceOffline: boolean
  }
}

export const mockUsers: MockUser[] = [
  {
    email: 'admin@baruch.io',
    password: 'admin123',
    name: 'Admin User',
    role: 'Administrator',
  },
  {
    email: 'operator@baruch.io',
    password: 'baruch2025',
    name: 'Fleet Operator',
    role: 'Operator',
  },
]

export function authenticateUser(email: string, password: string): MockUser | null {
  const user = mockUsers.find(
    (entry) => entry.email === email && entry.password === password,
  )
  return user ?? null
}

const profileDetails: Record<string, UserProfileDetails> = {
  'admin@baruch.io': {
    department: 'Platform Operations',
    phone: '+1 (555) 010-2001',
    timezone: 'America/New_York (UTC-5)',
    joinedDate: '12 Jan 2023',
    lastLogin: '15 May 2025, 09:15 AM',
    managedDevices: 24,
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      weeklyReports: true,
      deviceOffline: true,
    },
  },
  'operator@baruch.io': {
    department: 'Fleet Management',
    phone: '+1 (555) 010-2042',
    timezone: 'Europe/London (UTC+1)',
    joinedDate: '3 Mar 2024',
    lastLogin: '15 May 2025, 08:47 AM',
    managedDevices: 12,
    notifications: {
      emailAlerts: true,
      smsAlerts: true,
      weeklyReports: false,
      deviceOffline: true,
    },
  },
}

export function getUserProfile(email: string): UserProfileDetails | null {
  return profileDetails[email] ?? null
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
