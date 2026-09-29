import { createHmac } from 'node:crypto'
import { requiredEnv } from './env.ts'

/** Cognito SECRET_HASH: Base64(HMAC_SHA256(clientSecret, username + clientId)). */
export function secretHash(username: string): string {
  const clientId = requiredEnv('USER_POOL_CLIENT_ID')
  const clientSecret = requiredEnv('USER_POOL_CLIENT_SECRET')
  return createHmac('sha256', clientSecret).update(username + clientId).digest('base64')
}
