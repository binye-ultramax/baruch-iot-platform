import assert from 'node:assert/strict'
import test from 'node:test'
import { HttpError, mapCognitoError } from './errors.ts'

test('register maps a duplicate email to a conflict', () => {
  const error = mapCognitoError({ name: 'UsernameExistsException' }, 'register')
  assert.ok(error instanceof HttpError)
  assert.equal(error.statusCode, 409)
})

test('confirm maps a bad code to a client error', () => {
  const error = mapCognitoError({ name: 'CodeMismatchException' }, 'confirm')
  assert.ok(error instanceof HttpError)
  assert.equal(error.statusCode, 400)
  assert.match(error.message, /not valid/)
})

test('login hides whether the account exists', () => {
  const missing = mapCognitoError({ name: 'UserNotFoundException' }, 'login')
  const denied = mapCognitoError({ name: 'NotAuthorizedException' }, 'login')
  assert.equal(missing?.statusCode, 401)
  assert.equal(missing?.message, denied?.message)
})

test('login tells an unconfirmed user to confirm first', () => {
  const error = mapCognitoError({ name: 'UserNotConfirmedException' }, 'login')
  assert.equal(error?.statusCode, 403)
})

test('unknown failures stay unmapped', () => {
  assert.equal(mapCognitoError({ name: 'InternalError' }, 'login'), null)
})
