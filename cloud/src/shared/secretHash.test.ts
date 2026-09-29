import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { secretHash } from './secretHash.ts'

test('secretHash is the Cognito HMAC of username plus client id', () => {
  const previousId = process.env.USER_POOL_CLIENT_ID
  const previousSecret = process.env.USER_POOL_CLIENT_SECRET

  try {
    process.env.USER_POOL_CLIENT_ID = 'client'
    process.env.USER_POOL_CLIENT_SECRET = 'secret'
    const expected = createHmac('sha256', 'secret').update('user@example.comclient').digest('base64')
    assert.equal(secretHash('user@example.com'), expected)

    delete process.env.USER_POOL_CLIENT_SECRET
    assert.throws(() => secretHash('user@example.com'), { name: 'MissingConfigError' })
  } finally {
    restore('USER_POOL_CLIENT_ID', previousId)
    restore('USER_POOL_CLIENT_SECRET', previousSecret)
  }
})

function restore(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }
  process.env[name] = value
}
