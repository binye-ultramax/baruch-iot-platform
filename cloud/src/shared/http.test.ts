import assert from 'node:assert/strict'
import test from 'node:test'
import { readJsonBody, respondToError } from './http.ts'

test('readJsonBody parses a JSON object', () => {
  assert.deepEqual(readJsonBody({ body: '{"email":"a@b.co"}' }), { email: 'a@b.co' })
})

test('readJsonBody decodes a base64 body', () => {
  const body = Buffer.from('{"ok":true}', 'utf8').toString('base64')
  assert.deepEqual(readJsonBody({ body, isBase64Encoded: true }), { ok: true })
})

test('readJsonBody rejects an empty body', () => {
  assert.throws(() => readJsonBody({ body: '' }), { statusCode: 400 })
})

test('readJsonBody rejects invalid JSON', () => {
  assert.throws(() => readJsonBody({ body: '{' }), { statusCode: 400, message: 'Request body must be JSON.' })
})

test('readJsonBody rejects an oversized body', () => {
  assert.throws(() => readJsonBody({ body: `{"name":"${'a'.repeat(9000)}"}` }), { statusCode: 400 })
})

test('respondToError returns the mapped Cognito status', () => {
  const response = respondToError({ name: 'UsernameExistsException' }, 'register')
  assert.equal(response.statusCode, 409)
  assert.deepEqual(JSON.parse(response.body ?? ''), {
    message: 'An account with this email already exists.',
  })
})
