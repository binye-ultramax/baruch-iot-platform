export class MissingConfigError extends Error {
  constructor(name: string) {
    super(`Missing environment variable ${name}`)
    this.name = 'MissingConfigError'
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new MissingConfigError(name)
  }
  return value
}
