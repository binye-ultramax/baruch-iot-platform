const STORAGE_KEY = 'baruch-device-owners'

export function readDeviceOwners(): Record<string, string> {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

export function writeDeviceOwners(owners: Record<string, string>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(owners))
}

export function getEffectiveOwnerEmail(
  deviceId: string,
  defaultOwner?: string,
): string | undefined {
  return readDeviceOwners()[deviceId] ?? defaultOwner
}
